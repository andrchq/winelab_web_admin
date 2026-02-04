import * as XLSX from 'xlsx';

export interface InvoiceItem {
    id: string; // generated
    originalName: string;
    quantity: number;
    price?: number;
    sku?: string;
}

export const parseInvoiceFile = async (file: File): Promise<InvoiceItem[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) throw new Error("File is empty");

                let items: InvoiceItem[] = [];

                // JSON Handling
                if (file.name.toLowerCase().endsWith('.json')) {
                    try {
                        const json = JSON.parse(data as string);
                        // flexible parsing: check if array, or { items: array }, or { products: array }
                        const array = Array.isArray(json) ? json : (json.items || json.products || json.data || []);

                        if (Array.isArray(array)) {
                            array.forEach((row: any) => {
                                // Try to find name/qty fields
                                const name = row.name || row.title || row.productName || row.description || row.originalName || row.item;
                                const qty = row.qty || row.quantity || row.count || row.amount || row.expectedQuantity;
                                const sku = row.sku || row.code || row.article || row.id;

                                if (name) {
                                    items.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        originalName: String(name),
                                        quantity: Number(qty) || 1, // Default to 1 if missing
                                        sku: sku ? String(sku) : undefined
                                    });
                                }
                            });
                        }
                    } catch (err) {
                        console.warn("Failed to parse JSON directly", err);
                    }
                }
                // Excel/CSV Handling
                else {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    let headerFound = false;
                    let nameIdx = -1;
                    let qtyIdx = -1;
                    let skuIdx = -1;

                    // 1. Try to find header row
                    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;

                        const rowStr = row.map(c => String(c).toLowerCase());
                        const nIdx = rowStr.findIndex(c => c.includes('name') || c.includes('наименование') || c.includes('товар') || c.includes('description') || c.includes('item'));
                        const qIdx = rowStr.findIndex(c => c.includes('qty') || c.includes('quantity') || c.includes('кол') || c.includes('count') || c.includes('штук'));
                        const sIdx = rowStr.findIndex(c => c.includes('sku') || c.includes('art') || c.includes('код') || c.includes('артикул'));

                        if (nIdx !== -1 && qIdx !== -1) {
                            headerFound = true;
                            nameIdx = nIdx;
                            qtyIdx = qIdx;
                            skuIdx = sIdx;
                            // Skip this row as it is header, start parsing from next
                            // We need to loop from i+1
                            const dataRows = jsonData.slice(i + 1);
                            dataRows.forEach(dRow => {
                                const name = dRow[nameIdx];
                                const qty = dRow[qtyIdx];
                                const sku = skuIdx !== -1 ? dRow[skuIdx] : undefined;

                                if (name) {
                                    items.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        originalName: String(name),
                                        quantity: Number(qty) || 0,
                                        sku: sku ? String(sku) : undefined
                                    });
                                }
                            });
                            break;
                        }
                    }

                    // 2. Fallback: No header found, try simple columns
                    if (!headerFound && jsonData.length > 0) {
                        jsonData.forEach(row => {
                            // Heuristic: Longest string is name, Number is Qty
                            let nameVal = "";
                            let qtyVal = 0;

                            // Find first string > 3 chars
                            const strVal = row.find(c => typeof c === 'string' && c.length > 3);
                            // Find first number
                            const numVal = row.find(c => typeof c === 'number');

                            if (strVal) {
                                nameVal = strVal;
                                qtyVal = numVal || 1;
                                items.push({
                                    id: Math.random().toString(36).substr(2, 9),
                                    originalName: nameVal,
                                    quantity: Number(qtyVal)
                                });
                            } else if (row.length >= 2) {
                                // Assume col 0 is name, col 1 is qty
                                if (row[0]) {
                                    items.push({
                                        id: Math.random().toString(36).substr(2, 9),
                                        originalName: String(row[0]),
                                        quantity: Number(row[1]) || 1
                                    });
                                }
                            }
                        });
                    }
                }

                resolve(items);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);

        // Read based on type
        if (file.name.toLowerCase().endsWith('.json') || file.name.toLowerCase().endsWith('.txt')) {
            reader.readAsText(file);
        } else {
            // XLS/XLSX/CSV
            reader.readAsBinaryString(file);
        }
    });
};
