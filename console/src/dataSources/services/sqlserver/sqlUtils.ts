import { FrequentlyUsedColumn } from '../../types';
import { isColTypeString } from '.';
import { quoteDefault } from '../../../components/Services/Data/utils';

const sqlEscapeText = (text?: string | null) => {
  if (!text) {
    return 'NULL';
  }
  return `'%"${text}"%'`;
};

// isSQLFunction
export const isSQLFunction = (str: string | undefined) =>
  new RegExp(/.*\(\)$/gm).test(str || '');

// getRenameTableSql
export const getRenameTableSql = (
  schemaName: string,
  oldName: string,
  newName: string
) => `
  sp_rename "${schemaName}"."${oldName}", "${newName}";
`;

// getDropColumnSql,
export const getDropColumnSql = (
  tableName: string,
  schemaName: string,
  columnName: string,
  options?: {
    sqlGenerator?: FrequentlyUsedColumn['dependentSQLGenerator'];
  }
) => {
  let sql = `
  alter table "${schemaName}"."${tableName}" drop column "${columnName}"
`;
  if (!options) {
    return sql;
  }

  if (options.sqlGenerator) {
    sql = `${
      options.sqlGenerator(schemaName, tableName, columnName).downSql
    } \n`;
  }

  sql += `alter table "${schemaName}"."${tableName}" drop column "${columnName}"`;

  return sql;
};

// getDropNotNullSql,
export const getDropNotNullSql = (
  tableName: string,
  schemaName: string,
  columnName: string
) => `
 alter table "${schemaName}"."${tableName}" alter column "${columnName}" null
`;

// getSetNotNullSql,
export const getSetNotNullSql = (
  tableName: string,
  schemaName: string,
  columnName: string
) => `
 alter table "${schemaName}"."${tableName}" alter column "${columnName}" not null
`;

// getAddUniqueConstraintSql,
export const getAddUniqueConstraintSql = (
  tableName: string,
  schemaName: string,
  constraintName: string,
  columns: string[]
) => `
  alter table "${schemaName}"."${tableName}" add constraint "${constraintName}" unique (${columns.join(
  ', '
)})
`;

// getSetColumnDefaultSql,
export const getSetColumnDefaultSql = (
  tableName: string,
  schemaName: string,
  columnName: string,
  constraintName: string,
  defaultValue: any,
  columnType: string
) => {
  let defWithQuotes = '';

  if (isColTypeString(columnType) && !isSQLFunction(defaultValue)) {
    defWithQuotes = `'${defaultValue}'`;
  } else {
    defWithQuotes = defaultValue;
  }
  const sql = `
  alter table "${schemaName}"."${tableName}" add constraint "${constraintName}" default ${defWithQuotes} for "${columnName}"
`;
  return sql;
};

// getAddColumnSql
export const getAddColumnSql = (
  tableName: string,
  schemaName: string,
  columnName: string,
  columnType: string,
  options?: {
    nullable?: boolean;
    unique?: boolean;
    default?: any;
    sqlGenerator?: FrequentlyUsedColumn['dependentSQLGenerator'];
  }
) => {
  let sql = `
  alter table "${schemaName}"."${tableName}" add column "${columnName}" ${columnType}
`;
  if (!options) {
    return sql;
  }

  if (options.unique) {
    sql += ` unique`;
  }
  if (options.default) {
    const defWithQuotes = quoteDefault(options.default);
    sql += ` default ${defWithQuotes}`;
  }
  if (options.nullable) {
    sql += ' null';
  } else {
    if (options.default === '') {
      // error
    } else {
      sql += ` not null`;
    }

    sql += ';';

    if (options.sqlGenerator) {
      sql += '\n';
      sql += options.sqlGenerator(schemaName, tableName, columnName).upSql;
    }
    return sql;
  }

  // Add options condition
};

// getDropConstraintSql,
export const getDropConstraintSql = (
  tableName: string,
  schemaName: string,
  constraintName: string
) => `
  alter table "${schemaName}"."${tableName}" drop constraint "${constraintName}";
`;

// getDropSql,
export const getDropSql = (
  tableName: string,
  schemaName: string,
  property = 'table'
) => `DROP ${property} "${schemaName}"."${tableName}"`;

// getCreateTriggerSql,
export const getCreateTriggerSql = (
  tableName: string,
  tableSchema: string,
  triggerName: string,
  trigger: {
    action_timing: string;
    event_manipulation: string;
    action_statement: string;
    comment?: string;
  }
) => {
  let sql = `CREATE TRIGGER "${triggerName}"
ON "${tableSchema}"."${tableName}"
${trigger.action_timing} ${trigger.event_manipulation} AS ${trigger.action_statement};`;

  if (trigger.comment) {
    sql += `COMMENT ON TRIGGER "${triggerName}" ON "${tableSchema}"."${tableName}"
IS ${sqlEscapeText(trigger.comment)};`;
  }
  return sql;
};

// getDropTriggerSql,
export const getDropTriggerSql = (
  tableSchema: string,
  triggerName: string,
  tableName?: string // This arg has to be passed strictly
) => `
  DROP TRIGGER "${tableSchema}"."${tableName}"."${triggerName}";
`;

// getSetCommentSql,
export const getSetCommentSql = (
  on: 'column' | 'table' | string,
  tableName: string,
  schemaName: string,
  comment: string | null,
  columnName?: string
) => {
  if (columnName) {
    return `
  comment on ${on} "${schemaName}"."${tableName}"."${columnName}" is ${
      comment ? sqlEscapeText(comment) : 'NULL'
    }
`;
  }

  return `
comment on ${on} "${schemaName}"."${tableName}" is ${
    comment ? sqlEscapeText(comment) : 'NULL'
  }
`;
};

// getCreateFKeySql,
export const getCreateFKeySql = (
  from: {
    tableName: string;
    schemaName: string;
    columns: string[];
  },
  to: {
    tableName: string;
    schemaName: string;
    columns: string[];
  },
  newConstraint: string,
  onUpdate: string,
  onDelete: string
) => `
  alter table "${from.schemaName}"."${from.tableName}"
  add constraint "${newConstraint}"
  foreign key (${from.columns.join(', ')})
  references "${to.schemaName}"."${to.tableName}"
  (${to.columns.join(', ')}) on update ${onUpdate} on delete ${onDelete};
`;

// getAlterForeignKeySql,
export const getAlterForeignKeySql = (
  from: {
    tableName: string;
    schemaName: string;
    columns: string[];
  },
  to: {
    tableName: string;
    schemaName: string;
    columns: string[];
  },
  oldConstraint: string,
  newConstraint: string,
  onUpdate: string,
  onDelete: string
) => `
  alter table "${from.schemaName}"."${
  from.tableName
}" drop constraint "${oldConstraint}";
  alter table "${from.schemaName}"."${from.tableName}"
  add constraint "${newConstraint}"
  foreign key (${from.columns.join(', ')})
  references "${to.schemaName}"."${to.tableName}"
  (${to.columns.join(', ')}) on update ${onUpdate} on delete ${onDelete};
`;

// getAlterColumnTypeSql,
export const getAlterColumnTypeSql = (
  tableName: string,
  schemaName: string,
  columnName: string,
  columnType: string
) => `
  ALTER TABLE "${schemaName}"."${tableName}" ALTER COLUMN "${columnName}" ${columnType};
`;

// getDropColumnDefaultSql,
export const getDropColumnDefaultSql = (
  tableName: string,
  schemaName: string,
  constraintName: string
) => `
  alter table "${schemaName}"."${tableName}" drop constraint "${constraintName}";
`;

// getRenameColumnQuery,
export const getRenameColumnQuery = (
  tableName: string,
  schemaName: string,
  newName: string,
  oldName: string
) => `
  sp_rename "${schemaName}"."${tableName}"."${oldName}", "${newName}"
`;

export type Col = {
  name: string;
  type: string;
  nullable: boolean;
  default?: { value: string };
  dependentSQLGenerator?: (...args: any[]) => string;
};

export const getCreateTableQueries = (
  currentSchema: string,
  tableName: string,
  columns: Col[],
  primaryKeys: (number | string)[],
  foreignKeys: any[],
  uniqueKeys: any[],
  checkConstraints: any[],
  tableComment?: string
) => {
  const currentCols = columns.filter(c => c.name !== '');
  let hasGUIDDefault = false;

  const pKeys = primaryKeys
    .filter(p => p !== '')
    .map(p => currentCols[p as number].name);  

  const columnSpecificSql: any[] = [];

  let tableDefSql = '';
  for (let i = 0; i < currentCols.length; i++) {
    tableDefSql += `"${currentCols[i].name}" ${currentCols[i].type}`;

    // check if column is nullable
    if (!currentCols[i].nullable) {
      tableDefSql += ' NOT NULL';
    }

    // check if column has a default value
    if (
      currentCols[i].default !== undefined &&
      currentCols[i].default?.value !== ''
    ) {
      if (
        isColTypeString(currentCols[i].type) &&
        !isSQLFunction(currentCols[i]?.default?.value)
      ) {
        // if a column type is text and if it has a non-func default value, add a single quote by default
        tableDefSql += ` DEFAULT '${currentCols[i]?.default?.value}'`;
      } else {
        tableDefSql += ` DEFAULT ${currentCols[i]?.default?.value}`;
      }

      if (currentCols[i].type === 'guid') {
        hasGUIDDefault = true;
      }
    }

    // check if column has dependent sql
    const depGen = currentCols[i].dependentSQLGenerator;
    if (depGen) {
      const dependentSql = depGen(
        currentSchema,
        tableName,
        currentCols[i].name
      );
      columnSpecificSql.push(dependentSql);
    }

    tableDefSql += i === currentCols.length - 1 ? '' : ', ';
  }

  // add primary key
  if (pKeys.length > 0) {
    tableDefSql += ', PRIMARY KEY (';
    tableDefSql += pKeys.map(col => `"${col}"`).join(',');
    tableDefSql += ') ';
  }

  // add foreign keys
  const numFks = foreignKeys.length;
  let fkDupColumn = null;
  if (numFks > 1) {
    foreignKeys.forEach((fk, _i) => {
      if (_i === numFks - 1) {
        return;
      }

      const { colMappings, refTableName, onUpdate, onDelete } = fk;

      const mappingObj: Record<string, string> = {};
      const rCols: string[] = [];
      const lCols: string[] = [];

      colMappings
        .slice(0, -1)
        .forEach((cm: { column: string | number; refColumn: string }) => {
          if (mappingObj[cm.column] !== undefined) {
            fkDupColumn = columns[cm.column as number].name;
          }

          mappingObj[cm.column] = cm.refColumn;
          lCols.push(`"${columns[cm.column as number].name}"`);
          rCols.push(`"${cm.refColumn}"`);
        });

      if (lCols.length === 0) {
        return;
      }

      tableDefSql += `, FOREIGN KEY (${lCols.join(', ')}) REFERENCES "${
        fk.refSchemaName
      }"."${refTableName}"(${rCols.join(
        ', '
      )}) ON UPDATE ${onUpdate} ON DELETE ${onDelete}`;
    });
  }

  if (fkDupColumn) {
    return {
      error: `The column "${fkDupColumn}" seems to be referencing multiple foreign columns`,
    };
  }

  // add unique keys
  const numUniqueConstraints = uniqueKeys.length;
  if (numUniqueConstraints > 0) {
    uniqueKeys.forEach(uk => {
      if (!uk.length) {
        return;
      }

      const uniqueColumns = uk.map((c: number) => `"${columns[c].name}"`);
      tableDefSql += `, UNIQUE (${uniqueColumns.join(', ')})`;
    });
  }

  // add check constraints
  if (checkConstraints.length > 0) {
    checkConstraints.forEach(constraint => {
      if (!constraint.name || !constraint.check) {
        return;
      }

      tableDefSql += `, CONSTRAINT "${constraint.name}" CHECK (${constraint.check})`;
    });
  }

  let sqlCreateTable = `CREATE TABLE "${currentSchema}"."${tableName}" (${tableDefSql});`;

  // add comment
  if (tableComment && tableComment !== '') {
    sqlCreateTable += `COMMENT ON TABLE "${currentSchema}".${tableName} IS ${sqlEscapeText(
      tableComment
    )};`;
  }

  if (columnSpecificSql.length) {
    columnSpecificSql.forEach(csql => {
      sqlCreateTable += csql.upSql;
    });
  }

  const sqlQueries: string[] = [sqlCreateTable];

  if (hasGUIDDefault) {
    const sqlCreateExtension = 'CREATE EXTENSION IF NOT EXISTS pgcrypto;';

    sqlQueries.push(sqlCreateExtension);
  }

  return sqlQueries;
};

// getDropSchemaSql,
export const getDropSchemaSql = (schemaName: string) =>
  `drop schema "${schemaName}";`;

// getCreateSchemaSql,
export const getCreateSchemaSql = (schemaName: string) =>
  `create schema "${schemaName}";`;

// getDropTableSql,
export const getDropTableSql = (schema: string, table: string) => {
  return `DROP TABLE "${schema}"."${table}"`;
};

export const getCreateCheckConstraintSql = (
  tableName: string,
  schemaName: string,
  constraintName: string,
  check: string
) => {
  return `alter table "${schemaName}"."${tableName}" add constraint "${constraintName}" check (${check})`;
};

export const getCreatePkSql = ({
  schemaName,
  tableName,
  selectedPkColumns,
  constraintName,
}: {
  schemaName: string;
  tableName: string;
  selectedPkColumns: string[];
  constraintName?: string; // compulsory for PG
}) => {
  return `alter table "${schemaName}"."${tableName}"
    add constraint "${constraintName}"
    primary key (${selectedPkColumns.map(pkc => `"${pkc}"`).join(', ')});`;
};

export const cascadeSqlQuery = (sql: string) => {
  if (sql[sql.length - 1] === ';') {
    return `${sql.substr(0, sql.length - 1)} CASCADE;`;
  }
  // SQL might have  a " at the end
  else if (sql[sql.length - 2] === ';') {
    return `${sql.substr(0, sql.length - 2)} CASCADE;`;
  }
  return `${sql} CASCADE;`;
};

export const getDatabaseInfo = `
SELECT
		TABLE_NAME, 
		TABLE_SCHEMA,
		STRING_AGG(COLUMN_NAME, ',') as columns
	FROM
		information_schema.columns
    where
        table_schema NOT in('information_schema')
		AND table_schema NOT LIKE 'guest'
		AND table_schema NOT LIKE 'sys' 
	GROUP BY
		table_name,
		table_schema
    for JSON path
`;