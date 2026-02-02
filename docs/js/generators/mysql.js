import { SQLGenerator } from './sql.js';

export class MySQLGenerator extends SQLGenerator {
    generate(state) {
        let sql = '-- MySQL Export\n\n';
        
        state.tables.forEach(table => {
            sql += `CREATE TABLE \`${table.name}\` (\n`;
            
            const colDefs = table.columns.map(col => {
                return `  ${this.formatColumn(col)}`;
            });

            // PK
            const pks = table.columns.filter(c => c.pk).map(c => `\`${c.name}\``);
            if (pks.length > 0) {
                colDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
            }

            sql += colDefs.join(',\n');
            sql += `\n);\n\n`;
        });

        // Relations (Foreign Keys)
        state.relations.forEach(rel => {
            const fromTable = state.tables.find(t => t.id === rel.fromTable);
            const toTable = state.tables.find(t => t.id === rel.toTable);
            const fromCol = fromTable?.columns.find(c => c.id === rel.fromCol);
            const toCol = toTable?.columns.find(c => c.id === rel.toCol);

            if (fromTable && toTable && fromCol && toCol) {
                sql += `ALTER TABLE \`${fromTable.name}\` ADD FOREIGN KEY (\`${fromCol.name}\`) REFERENCES \`${toTable.name}\` (\`${toCol.name}\`);\n`;
            }
        });

        return sql;
    }

    formatColumn(col) {
        let def = `\`${col.name}\` ${col.type}`;
        // In MySQL, PK can be defined here or at the end. I chose end.
        return def;
    }
}
