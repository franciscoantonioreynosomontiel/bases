export class SQLGenerator {
    generate(state) {
        throw new Error('generate() must be implemented');
    }

    formatColumn(col) {
        throw new Error('formatColumn() must be implemented');
    }
}
