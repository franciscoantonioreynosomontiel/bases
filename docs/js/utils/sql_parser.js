/**
 * Simple SQL Parser for CREATE TABLE statements and ALTER TABLE relations
 * Focuses on extracting table names, columns, and basic constraints.
 */
export class SQLParser {
    static parse(sql) {
        const tables = [];
        const relations = [];
        
        // Remove comments
        sql = sql.replace(/\-\-.*$/gm, '');
        sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');

        // Match CREATE TABLE blocks
        const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\s*\(([\s\S]*?)\);/gi;
        let tableMatch;

        while ((tableMatch = tableRegex.exec(sql)) !== null) {
            const tableName = tableMatch[1];
            const body = tableMatch[2];
            
            const table = {
                id: 'table_' + tableName,
                name: tableName,
                posX: 100 + (tables.length * 250) % 800,
                posY: 100 + Math.floor(tables.length / 3) * 300,
                columns: []
            };

            // Parse columns and constraints
            const lines = body.split(/,(?![^(]*\))/); // Split by comma not inside parentheses
            
            lines.forEach(line => {
                line = line.trim();
                if (!line) return;

                // Check for table-level FOREIGN KEY constraint
                const fkMatch = /FOREIGN\s+KEY\s*\((?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\)\s+REFERENCES\s+(?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\s*\((?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\)/i.exec(line);
                if (fkMatch) {
                    relations.push({
                        fromTable: table.id,
                        fromCol: 'col_' + table.name + '_' + fkMatch[1],
                        toTable: 'table_' + fkMatch[2],
                        toCol: 'col_' + fkMatch[2] + '_' + fkMatch[3],
                        type: '1:N'
                    });
                    return;
                }

                // Check for table-level PRIMARY KEY constraint
                const pkMatch = /PRIMARY\s+KEY\s*\(([\s\S]*?)\)/i.exec(line);
                if (pkMatch) {
                    const pkCols = pkMatch[1].split(',').map(c => c.trim().replace(/[`"\[\]]/g, ''));
                    pkCols.forEach(pkColName => {
                        const col = table.columns.find(c => c.name === pkColName);
                        if (col) col.pk = true;
                    });
                    return;
                }

                // Parse column definition
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                    const colName = parts[0].replace(/[`"\[\]]/g, '');
                    const colType = parts[1].toUpperCase();
                    
                    const isPK = /PRIMARY\s+KEY/i.test(line);
                    const isFKMatch = /REFERENCES\s+(?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\s*\((?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\)/i.exec(line);

                    const col = {
                        id: 'col_' + table.name + '_' + colName,
                        name: colName,
                        type: colType,
                        pk: isPK,
                        fk: !!isFKMatch
                    };

                    if (isFKMatch) {
                        relations.push({
                            fromTable: table.id,
                            fromCol: col.id,
                            toTable: 'table_' + isFKMatch[1],
                            toCol: 'col_' + isFKMatch[1] + '_' + isFKMatch[2],
                            type: '1:N'
                        });
                    }

                    table.columns.push(col);
                }
            });

            tables.push(table);
        }

        // Match ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY or simply ALTER TABLE ... ADD FOREIGN KEY
        const alterFkRegex = /ALTER\s+TABLE\s+(?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\s+(?:ADD\s+)?(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\((?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\)\s+REFERENCES\s+(?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\s*\((?:[`"\[])?([a-zA-Z0-9_]+)(?:[`"\]])?\)/gi;
        let alterMatch;
        while ((alterMatch = alterFkRegex.exec(sql)) !== null) {
            const fromTable = alterMatch[1];
            const fromCol = alterMatch[2];
            const toTable = alterMatch[3];
            const toCol = alterMatch[4];
            
            const rel = {
                fromTable: 'table_' + fromTable,
                fromCol: 'col_' + fromTable + '_' + fromCol,
                toTable: 'table_' + toTable,
                toCol: 'col_' + toTable + '_' + toCol,
                type: '1:N'
            };

            // Avoid duplicates
            if (!relations.find(r => r.fromCol === rel.fromCol && r.toCol === rel.toCol)) {
                relations.push(rel);
            }
            
            // Mark column as FK if table exists
            const table = tables.find(t => t.name === fromTable);
            if (table) {
                const col = table.columns.find(c => c.name === fromCol);
                if (col) col.fk = true;
            }
        }

        // Generate IDs for relations if missing
        relations.forEach((rel, index) => {
            if (!rel.id) rel.id = 'rel_' + index;
        });

        return { tables, relations };
    }
}
