import { FrequentlyUsedColumn } from "../../types";
import { isColTypeString } from "../postgresql";

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
  alter table "${from.schemaName}"."${from.tableName}" drop constraint "${oldConstraint}";
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