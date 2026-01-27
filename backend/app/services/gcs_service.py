"""GCS (Google Cloud Storage) service for file operations."""
import re
from typing import List, Dict
from google.cloud import storage
import pandas as pd
import io


class GCSService:
    """Service for GCS file operations."""
    
    def __init__(self):
        """Initialize GCS service."""
        self._client = None

    @property
    def client(self):
        """Lazy load GCS client."""
        if not self._client:
            self._client = storage.Client()
        return self._client
    
    async def resolve_pattern(self, bucket_name: str, pattern: str) -> List[str]:
        """
        Resolve wildcard patterns in GCS file paths.
        
        Args:
            bucket_name: GCS bucket name
            pattern: File path pattern (supports * wildcard)
            
        Returns:
            List of matching file paths
            
        Raises:
            ValueError: If no files match the pattern
        """
        # If no wildcard, return as-is
        if '*' not in pattern:
            return [pattern]
        
        try:
            bucket = self.client.bucket(bucket_name)
            
            # Get prefix before wildcard
            prefix = pattern.split('*')[0]
            
            # List files with prefix
            blobs = bucket.list_blobs(prefix=prefix)
            
            # Convert pattern to regex
            regex_pattern = pattern.replace('*', '.*')
            regex = re.compile(f'^{regex_pattern}$')
            
            # Filter matching files
            matching_files = [
                blob.name for blob in blobs
                if regex.match(blob.name)
            ]
            
            if not matching_files:
                raise ValueError(
                    f"No files found matching pattern: gs://{bucket_name}/{pattern}"
                )
            
            return matching_files
            
        except Exception as e:
            raise ValueError(
                f"Failed to resolve pattern gs://{bucket_name}/{pattern}: {str(e)}"
            )
    
    async def count_file_rows(self, bucket_name: str, file_path: str, format: str = 'csv') -> int:
        """Count rows in a GCS file of various formats."""
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(file_path)
            
            if not blob.exists():
                raise FileNotFoundError(f"File not found: gs://{bucket_name}/{file_path}")
            
            content = blob.download_as_bytes()
            
            if format.lower() == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            elif format.lower() == 'json':
                df = pd.read_json(io.BytesIO(content), lines=True) # Assume newline delimited
            elif format.lower() == 'parquet':
                df = pd.read_parquet(io.BytesIO(content))
            elif format.lower() == 'avro':
                 import fastavro
                 with io.BytesIO(content) as f:
                     reader = fastavro.reader(f)
                     return sum(1 for _ in reader)
            else:
                 # Default to CSV but log warning
                 logger.warning(f"Unknown format {format}, defaulting to CSV")
                 df = pd.read_csv(io.BytesIO(content))
            
            return len(df)
            
        except Exception as e:
            logger.error(f"Failed to count rows in gs://{bucket_name}/{file_path} ({format}): {str(e)}")
            return 0 # Fallback

    async def sample_file_data(
        self, 
        bucket_name: str, 
        file_path: str, 
        format: str = 'csv',
        limit: int = 5
    ) -> List[Dict]:
        """Sample data from a GCS file of various formats."""
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(file_path)
            
            if not blob.exists():
                return []
            
            content = blob.download_as_bytes()
            
            if format.lower() == 'csv':
                df = pd.read_csv(io.BytesIO(content), nrows=limit)
            elif format.lower() == 'json':
                df = pd.read_json(io.BytesIO(content), lines=True, chunksize=limit).__next__()
            elif format.lower() == 'parquet':
                df = pd.read_parquet(io.BytesIO(content))[:limit]
            elif format.lower() == 'avro':
                 import fastavro
                 with io.BytesIO(content) as f:
                     rows = []
                     reader = fastavro.reader(f)
                     for i, record in enumerate(reader):
                         rows.append(record)
                         if i + 1 >= limit: break
                     return rows
            else:
                 df = pd.read_csv(io.BytesIO(content), nrows=limit)
            
            return df.to_dict('records')
            
        except Exception as e:
            logger.error(f"Failed to sample data from gs://{bucket_name}/{file_path} ({format}): {str(e)}")
            return []
    
    async def get_csv_headers(self, bucket_name: str, file_path: str) -> List[str]:
        """
        Get column headers from a CSV file.
        
        Args:
            bucket_name: GCS bucket name
            file_path: Path to CSV file
            
        Returns:
            List of column names
        """
        try:
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(file_path)
            
            if not blob.exists():
                raise FileNotFoundError(
                    f"File not found: gs://{bucket_name}/{file_path}"
                )
            
            # Download and get headers using pandas
            content = blob.download_as_bytes()
            df = pd.read_csv(io.BytesIO(content), nrows=0)
            
            return df.columns.tolist()
            
        except Exception as e:
            raise ValueError(
                f"Failed to get headers from gs://{bucket_name}/{file_path}: {str(e)}"
            )


# Singleton instance
gcs_service = GCSService()
