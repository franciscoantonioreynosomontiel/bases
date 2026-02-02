import { SQLGenerator } from './sql.js';

export class StandardSQLGenerator extends SQLGenerator {
    generate(state) {
        let sql = '-- Standard SQL Export\n\n';
        
        state.tables.forEach(table => {
            sql += `CREATE TABLE ${table.name} (\n`;
            
            const colDefs = table.columns.map(col => {
                return `  ${this.formatColumn(col)}`;
            });

            // PK
            const pks = table.columns.filter(c => c.pk).map(c => c.name);
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
                sql += `ALTER TABLE ${fromTable.name} ADD CONSTRAINT fk_${fromTable.name}_${fromCol.name} FOREIGN KEY (${fromCol.name}) REFERENCES ${toTable.name} (${toCol.name});\n`;
            }
        });

        return sql;
    }

    formatColumn(col) {
        return `${col.name} ${col.type}`;
    }
}
