// Predefined test templates for data quality validation
export interface TestTemplate {
    id: string;
    name: string;
    category: 'completeness' | 'integrity' | 'quality' | 'statistical' | 'business';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    isGlobal: boolean;
    generateSQL: (config: any) => string | null;
}

export const PREDEFINED_TESTS: Record<string, TestTemplate> = {
    row_count_match: {
        id: 'row_count_match',
        name: 'Row Count Match',
        category: 'completeness',
        severity: 'HIGH',
        description: 'Verify source and target row counts match',
        isGlobal: true,
        generateSQL: () => null // Handled programmatically
    },

    no_nulls_required: {
        id: 'no_nulls_required',
        name: 'No NULLs in Required Fields',
        category: 'completeness',
        severity: 'HIGH',
        description: 'Check required columns have no NULL values',
        isGlobal: true,
        generateSQL: (config) => {
            if (!config.required_columns || config.required_columns.length === 0) {
                return null;
            }
            const conditions = config.required_columns
                .map((col: string) => `${col} IS NULL`)
                .join(' OR ');
            return `
        SELECT * FROM \`${config.fullTableName}\`
        WHERE ${conditions}
        LIMIT 100
      `;
        }
    },

    no_duplicates_pk: {
        id: 'no_duplicates_pk',
        name: 'No Duplicate Primary Keys',
        category: 'integrity',
        severity: 'HIGH',
        description: 'Ensure primary key uniqueness',
        isGlobal: true,
        generateSQL: (config) => {
            if (!config.primary_key_columns || config.primary_key_columns.length === 0) {
                return null;
            }
            const pkCols = config.primary_key_columns.join(', ');
            return `
        SELECT ${pkCols}, COUNT(*) as duplicate_count
        FROM \`${config.fullTableName}\`
        GROUP BY ${pkCols}
        HAVING COUNT(*) > 1
      `;
        }
    },

    referential_integrity: {
        id: 'referential_integrity',
        name: 'Referential Integrity',
        category: 'integrity',
        severity: 'HIGH',
        description: 'Validate foreign key relationships',
        isGlobal: false,
        generateSQL: (config) => {
            if (!config.foreign_key_checks || Object.keys(config.foreign_key_checks).length === 0) {
                return null;
            }

            const checks = Object.entries(config.foreign_key_checks).map(([fkCol, ref]: [string, any]) => `
        SELECT 
          '${fkCol}' as fk_column, 
          ${fkCol} as invalid_value,
          COUNT(*) as occurrence_count
        FROM \`${config.fullTableName}\` t
        WHERE ${fkCol} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM \`${ref.table}\` r
          WHERE r.${ref.column} = t.${fkCol}
        )
        GROUP BY ${fkCol}
      `).join(' UNION ALL ');

            return checks;
        }
    },

    numeric_range: {
        id: 'numeric_range',
        name: 'Numeric Range Validation',
        category: 'quality',
        severity: 'MEDIUM',
        description: 'Check numeric values are within expected ranges',
        isGlobal: false,
        generateSQL: (config) => {
            if (!config.numeric_range_checks || Object.keys(config.numeric_range_checks).length === 0) {
                return null;
            }

            const conditions = Object.entries(config.numeric_range_checks)
                .map(([col, range]: [string, any]) =>
                    `(${col} < ${range.min} OR ${col} > ${range.max})`
                )
                .join(' OR ');

            return `
        SELECT * FROM \`${config.fullTableName}\`
        WHERE ${conditions}
        LIMIT 100
      `;
        }
    },

    date_range: {
        id: 'date_range',
        name: 'Date Range Validation',
        category: 'quality',
        severity: 'MEDIUM',
        description: 'Validate dates are within expected range',
        isGlobal: false,
        generateSQL: (config) => {
            if (!config.date_range_checks || Object.keys(config.date_range_checks).length === 0) {
                return null;
            }

            const conditions = Object.entries(config.date_range_checks)
                .map(([col, range]: [string, any]) =>
                    `(${col} < '${range.min_date}' OR ${col} > '${range.max_date}')`
                )
                .join(' OR ');

            return `
        SELECT * FROM \`${config.fullTableName}\`
        WHERE ${conditions}
        LIMIT 100
      `;
        }
    },

    pattern_validation: {
        id: 'pattern_validation',
        name: 'Pattern Validation',
        category: 'quality',
        severity: 'MEDIUM',
        description: 'Check string patterns (email, phone, etc.)',
        isGlobal: false,
        generateSQL: (config) => {
            if (!config.pattern_checks || Object.keys(config.pattern_checks).length === 0) {
                return null;
            }

            const conditions = Object.entries(config.pattern_checks)
                .map(([col, pattern]: [string, any]) =>
                    `NOT REGEXP_CONTAINS(CAST(${col} AS STRING), r'${pattern}')`
                )
                .join(' OR ');

            return `
        SELECT * FROM \`${config.fullTableName}\`
        WHERE ${conditions}
        LIMIT 100
      `;
        }
    },

    outlier_detection: {
        id: 'outlier_detection',
        name: 'Statistical Outlier Detection',
        category: 'statistical',
        severity: 'LOW',
        description: 'Detect statistical outliers using standard deviation',
        isGlobal: false,
        generateSQL: (config) => {
            if (!config.outlier_columns || config.outlier_columns.length === 0) {
                return null;
            }

            const col = config.outlier_columns[0]; // Check first column
            return `
        WITH stats AS (
          SELECT 
            AVG(${col}) as mean,
            STDDEV(${col}) as stddev
          FROM \`${config.fullTableName}\`
          WHERE ${col} IS NOT NULL
        )
        SELECT t.* 
        FROM \`${config.fullTableName}\` t, stats
        WHERE ABS(t.${col} - stats.mean) > 3 * stats.stddev
        LIMIT 100
      `;
        }
    }
};

// Helper to get enabled tests for a mapping
export function getEnabledTests(enabledTestIds?: string[]): TestTemplate[] {
    if (!enabledTestIds || enabledTestIds.length === 0) {
        // Return all global tests by default
        return Object.values(PREDEFINED_TESTS).filter(t => t.isGlobal);
    }

    return enabledTestIds
        .map(id => PREDEFINED_TESTS[id])
        .filter(t => t !== undefined);
}
