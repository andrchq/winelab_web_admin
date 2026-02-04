"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface ImportStoresDialogProps {
    onSuccess?: () => void;
}

interface FilePreview {
    totalRows: number;
    validRows: number;
    missingFields: number;
    duplicates: number;
    columns: string[];
    sampleData: any[];
    issues: string[];
}

const REQUIRED_COLUMNS = ['SAP', 'Address'];
const EXPECTED_COLUMNS = ['SAP', 'ЦФО', 'Город', 'Address', 'Юр.лицо', 'ip Сервера', 'Telephone', 'ИНН', 'КПП', 'ФСРАР'];

export function ImportStoresDialog({ onSuccess }: ImportStoresDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<FilePreview | null>(null);
    const [result, setResult] = useState<{
        message: string;
        stats: { created: number; updated: number; total: number };
        errors?: string[];
    } | null>(null);

    // Reset state when dialog opens/closes
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setTimeout(() => {
                setFile(null);
                setResult(null);
                setPreview(null);
                setLoading(false);
                setValidating(false);
            }, 300);
        }
    };

    // Validate and preview file when selected
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setResult(null);
            setPreview(null);

            // Validate file
            setValidating(true);
            try {
                const filePreview = await validateXLSXFile(selectedFile);
                setPreview(filePreview);
            } catch (error: any) {
                toast.error("Ошибка чтения файла: " + error.message);
            } finally {
                setValidating(false);
            }
        }
    };

    const validateXLSXFile = async (file: File): Promise<FilePreview> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                    const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                    const issues: string[] = [];

                    // Check for required columns
                    const missingRequired = REQUIRED_COLUMNS.filter(col =>
                        !columns.some(c => c.toLowerCase() === col.toLowerCase())
                    );
                    if (missingRequired.length > 0) {
                        issues.push(`Отсутствуют обязательные колонки: ${missingRequired.join(', ')}`);
                    }

                    // Count valid rows (with SAP and Address)
                    let validRows = 0;
                    let missingFields = 0;
                    const sapValues = new Set<string>();
                    let duplicates = 0;

                    for (const row of jsonData) {
                        const sap = row['SAP'] || row['sap'] || row['Sap'];
                        const address = row['Address'] || row['address'] || row['Адрес'];

                        if (sap && address) {
                            if (sapValues.has(String(sap))) {
                                duplicates++;
                            } else {
                                sapValues.add(String(sap));
                                validRows++;
                            }
                        } else {
                            missingFields++;
                        }
                    }

                    if (missingFields > 0) {
                        issues.push(`${missingFields} строк без обязательных полей (SAP или Address)`);
                    }
                    if (duplicates > 0) {
                        issues.push(`${duplicates} дубликатов SAP кода в файле`);
                    }

                    // Check for expected columns
                    const foundExpected = EXPECTED_COLUMNS.filter(col =>
                        columns.some(c => c.toLowerCase().includes(col.toLowerCase()) || col.toLowerCase().includes(c.toLowerCase()))
                    );
                    if (foundExpected.length < EXPECTED_COLUMNS.length / 2) {
                        issues.push(`Найдено только ${foundExpected.length} из ${EXPECTED_COLUMNS.length} ожидаемых колонок`);
                    }

                    resolve({
                        totalRows: jsonData.length,
                        validRows,
                        missingFields,
                        duplicates,
                        columns,
                        sampleData: jsonData.slice(0, 3),
                        issues
                    });
                } catch (error: any) {
                    reject(new Error("Не удалось прочитать XLSX файл"));
                }
            };
            reader.onerror = () => reject(new Error("Ошибка чтения файла"));
            reader.readAsArrayBuffer(file);
        });
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/stores/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка загрузки');
            }

            const data = await response.json();
            setResult(data);
            toast.success("Импорт завершен");
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Ошибка при импорте");
        } finally {
            setLoading(false);
        }
    };

    const canUpload = preview && preview.validRows > 0 && preview.issues.filter(i => i.includes('Отсутствуют обязательные')).length === 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Импорт XLSX
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Импорт магазинов</DialogTitle>
                    <DialogDescription>
                        Загрузите XLSX файл с данными магазинов.
                        <br />
                        <span className="text-xs text-muted-foreground">
                            Обязательные колонки: SAP, Address
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="space-y-4 py-4">
                        {/* File Input */}
                        <div className="space-y-2">
                            <Label htmlFor="file">Файл (XLSX)</Label>
                            <Input
                                id="file"
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="cursor-pointer"
                            />
                        </div>

                        {/* File Info */}
                        {file && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                                <FileSpreadsheet className="h-4 w-4" />
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </div>
                        )}

                        {/* Validating Spinner */}
                        {validating && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Анализ файла...
                            </div>
                        )}

                        {/* Preview */}
                        {preview && !validating && (
                            <div className="space-y-4">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-muted/30 p-3 rounded-lg border">
                                        <div className="text-xl font-bold">{preview.totalRows}</div>
                                        <div className="text-xs text-muted-foreground">Всего строк</div>
                                    </div>
                                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                        <div className="text-xl font-bold text-emerald-600">{preview.validRows}</div>
                                        <div className="text-xs text-emerald-600/80">Будет добавлено</div>
                                    </div>
                                    <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                        <div className="text-xl font-bold text-amber-600">{preview.duplicates}</div>
                                        <div className="text-xs text-amber-600/80">Дубликатов</div>
                                    </div>
                                    <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                        <div className="text-xl font-bold text-red-600">{preview.missingFields}</div>
                                        <div className="text-xs text-red-600/80">Пропущено</div>
                                    </div>
                                </div>

                                {/* Columns Found */}
                                <div className="bg-muted/30 p-3 rounded-lg border">
                                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                        <Info className="h-4 w-4" />
                                        Найденные колонки ({preview.columns.length})
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {preview.columns.slice(0, 15).map((col, i) => (
                                            <span key={i} className={`text-xs px-2 py-1 rounded ${REQUIRED_COLUMNS.some(r => col.toLowerCase().includes(r.toLowerCase()))
                                                    ? 'bg-emerald-500/20 text-emerald-700'
                                                    : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {col}
                                            </span>
                                        ))}
                                        {preview.columns.length > 15 && (
                                            <span className="text-xs px-2 py-1 text-muted-foreground">
                                                +{preview.columns.length - 15} колонок
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Issues */}
                                {preview.issues.length > 0 && (
                                    <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                                        <div className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
                                            <AlertTriangle className="h-4 w-4" />
                                            Предупреждения
                                        </div>
                                        <ul className="text-xs text-amber-700 space-y-1">
                                            {preview.issues.map((issue, i) => (
                                                <li key={i}>• {issue}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Ready status */}
                                {canUpload && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                                        <CheckCircle className="h-4 w-4" />
                                        Файл готов к импорту
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="flex items-center gap-2 text-green-500 font-medium">
                            <CheckCircle className="h-5 w-5" />
                            <span>Импорт успешно выполнен!</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-muted/30 p-3 rounded-lg border">
                                <div className="text-2xl font-bold">{result.stats.total}</div>
                                <div className="text-xs text-muted-foreground">Всего строк</div>
                            </div>
                            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                <div className="text-2xl font-bold text-emerald-600">{result.stats.created}</div>
                                <div className="text-xs text-emerald-600/80">Создано</div>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                <div className="text-2xl font-bold text-blue-600">{result.stats.updated}</div>
                                <div className="text-xs text-blue-600/80">Обновлено</div>
                            </div>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4">
                                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Ошибки ({result.errors.length})</span>
                                </div>
                                <div className="bg-destructive/10 p-3 rounded-lg text-sm max-h-[150px] overflow-y-auto space-y-1">
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="text-destructive-foreground">{err}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <Button onClick={handleUpload} disabled={!canUpload || loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {preview ? `Загрузить ${preview.validRows} магазинов` : 'Загрузить'}
                        </Button>
                    ) : (
                        <Button onClick={() => setOpen(false)}>
                            Закрыть
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
