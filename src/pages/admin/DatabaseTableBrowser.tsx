import { useEffect, useState, useCallback } from 'react';
import { blink } from '@/lib/blink';
import { DATABASE_TABLES, TABLE_CATEGORIES, TableInfo } from '@/utils/databaseTables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Database, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

interface TableData {
  [key: string]: unknown;
}

export default function DatabaseTableBrowser() {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showPreview, setShowPreview] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchRowCounts();
  }, []);

  const parseQueryResult = (result: unknown): unknown[] => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (typeof result === 'object' && 'rows' in result && Array.isArray((result as any).rows)) {
      return (result as any).rows;
    }
    return [];
  };

  const fetchRowCounts = async () => {
    try {
      setLoading(true);
      const counts: Record<string, number> = {};

      await Promise.all(
        DATABASE_TABLES.map(async (table) => {
          try {
            const result = await blink.db.sql<{ count: string }>(
              `SELECT COUNT(*) as count FROM ${table.name}`
            );

            const data = parseQueryResult(result);
            let count = 0;
            
            if (data.length > 0) {
              const firstRow = data[0] as Record<string, unknown>;
              count = parseInt(String(firstRow.count || 0)) || 0;
            }
            counts[table.name] = count;
          } catch (error) {
            console.warn(`Failed to fetch count for ${table.name}:`, error);
            counts[table.name] = 0;
          }
        })
      );

      setRowCounts(counts);
    } catch (error) {
      console.error('Error fetching row counts:', error);
      toast.error('Failed to fetch table statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = useCallback(async (table: TableInfo, page: number = 1) => {
    try {
      setDataLoading(true);
      const offset = (page - 1) * pageSize;

      // First, get the total count for this table
      const countResult = await blink.db.sql<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${table.name}`
      );
      const countData = parseQueryResult(countResult);
      const total = countData.length > 0 
        ? parseInt(String((countData[0] as Record<string, unknown>).count || 0)) || 0 
        : 0;
      setTotalRecords(total);

      // Then get the paginated data
      const result = await blink.db.sql<TableData>(
        `SELECT * FROM ${table.name} LIMIT ${pageSize} OFFSET ${offset}`
      );

      const data = parseQueryResult(result) as TableData[];
      setTableData(data || []);
      setSelectedTable(table);
      setCurrentPage(page);
      setShowPreview(true);
    } catch (error) {
      console.error(`Error fetching data from ${table.name}:`, error);
      toast.error(`Failed to load data from ${table.name}`);
      setTableData([]);
    } finally {
      setDataLoading(false);
    }
  }, [pageSize]);

  const filteredTables = DATABASE_TABLES.filter((table) => {
    const matchesSearch = table.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || table.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Object.keys(TABLE_CATEGORIES)] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Database Tables</h1>
        <p className="text-muted-foreground">
          Access and view all {DATABASE_TABLES.length} database tables with full data browsing
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={fetchRowCounts}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {category === 'all' ? 'All Tables' : (TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES]?.label || category)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredTables.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tables found matching your search</p>
            </CardContent>
          </Card>
        ) : (
          filteredTables.map((table) => {
            const count = rowCounts[table.name] ?? 0;
            const categoryColor = TABLE_CATEGORIES[table.category as keyof typeof TABLE_CATEGORIES]?.color || 'bg-gray-100 text-gray-700';

            return (
              <Card key={table.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{table.displayName}</CardTitle>
                        <Badge className={categoryColor} variant="outline">
                          {TABLE_CATEGORIES[table.category as keyof typeof TABLE_CATEGORIES]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{table.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            {loading ? '...' : `${count} row${count !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {table.columns.length} columns
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => fetchTableData(table, 1)}
                      variant="default"
                      size="sm"
                      className="gap-2"
                      disabled={dataLoading || count === 0}
                    >
                      {dataLoading ? (
                        <>
                          <Spinner className="w-4 h-4" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          View Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Columns</p>
                    <div className="flex flex-wrap gap-2">
                      {table.columns.map((col) => (
                        <Badge key={col} variant="secondary" className="font-mono text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedTable?.displayName} - Data Preview</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-auto max-h-[calc(80vh-120px)]">
            {tableData.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No data to display</p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedTable?.columns.map((col) => (
                        <TableHead key={col} className="text-xs">
                          <div className="font-semibold text-foreground">{col}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, idx) => (
                      <TableRow key={idx}>
                        {selectedTable?.columns.map((col) => {
                          const value = row[col];
                          const displayValue = value === null ? '—' : String(value).substring(0, 100);

                          return (
                            <TableCell key={`${idx}-${col}`} className="text-xs font-mono">
                              {displayValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {tableData.length > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-4">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedTable && fetchTableData(selectedTable, Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || dataLoading}
                    size="sm"
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => selectedTable && fetchTableData(selectedTable, currentPage + 1)}
                    disabled={currentPage * pageSize >= totalRecords || dataLoading}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
