import { useEffect, useState, useMemo, useCallback } from 'react';
import { blink } from '@/lib/blink';
import { DATABASE_TABLES, TABLE_CATEGORIES, TableInfo } from '@/utils/databaseTables';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Database, RefreshCw, ChevronDown, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

interface TableMetadata {
  name: string;
  displayName: string;
  description: string;
  columns: string[];
  category: string;
  rowCount: number;
}

interface TableData {
  [key: string]: unknown;
}

export default function AllTablesView() {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rows' | 'columns'>('name');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchAllTableMetadata();
  }, []);

  const parseQueryResult = (result: unknown): unknown[] => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    if (typeof result === 'object' && 'rows' in result && Array.isArray((result as any).rows)) {
      return (result as any).rows;
    }
    return [];
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

  const fetchAllTableMetadata = async () => {
    try {
      setLoading(true);
      const metadata: TableMetadata[] = [];

      await Promise.all(
        DATABASE_TABLES.map(async (table) => {
          try {
            const result = await blink.db.sql<{ count: string }>(
              `SELECT COUNT(*) as count FROM ${table.name}`
            );

            let rowCount = 0;
            if (Array.isArray(result)) {
              if (result.length > 0) {
                const count = (result[0] as any).count;
                rowCount = parseInt(String(count)) || 0;
              }
            } else if (typeof result === 'object' && 'rows' in result) {
              const rows = (result as any).rows;
              if (Array.isArray(rows) && rows.length > 0) {
                const count = (rows[0] as any).count;
                rowCount = parseInt(String(count)) || 0;
              }
            } else if (typeof result === 'object') {
              const count = (result as any).count;
              rowCount = parseInt(String(count)) || 0;
            }

            metadata.push({
              name: table.name,
              displayName: table.displayName,
              description: table.description,
              columns: table.columns,
              category: table.category,
              rowCount
            });
            console.log(`✓ ${table.name}: ${rowCount} rows`);
          } catch (error) {
            console.warn(`Failed to fetch metadata for ${table.name}:`, error);
            metadata.push({
              name: table.name,
              displayName: table.displayName,
              description: table.description,
              columns: table.columns,
              category: table.category,
              rowCount: 0
            });
          }
        })
      );

      setTables(metadata);
      toast.success(`Loaded metadata for ${metadata.length} tables`);
    } catch (error) {
      console.error('Error fetching table metadata:', error);
      toast.error('Failed to load table metadata');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTables = useMemo(() => {
    let result = tables.filter((table) => {
      const matchesSearch =
        table.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || table.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'rows':
          return b.rowCount - a.rowCount;
        case 'columns':
          return b.columns.length - a.columns.length;
        case 'name':
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });

    return result;
  }, [tables, searchTerm, selectedCategory, sortBy]);

  const toggleRowExpanded = (tableName: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedRows(newExpanded);
  };

  const getCategoryBadgeColor = (category: string) => {
    const categoryInfo = TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES];
    return categoryInfo?.color || 'bg-gray-100 text-gray-700';
  };

  const totalTables = tables.length;
  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">All Database Tables</h1>
        <p className="text-muted-foreground">
          Complete overview of all {totalTables} database tables with detailed metadata
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Tables</p>
              <p className="text-3xl font-bold">{totalTables}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-3xl font-bold">{totalRows.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Columns</p>
              <p className="text-3xl font-bold">{totalColumns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables by name, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={fetchAllTableMetadata}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex gap-4 flex-col md:flex-row">
              <div className="flex-1">
                <label className="text-sm font-medium">Category</label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {['all', ...Object.keys(TABLE_CATEGORIES)].map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {category === 'all' ? 'All' : (TABLE_CATEGORIES[category as keyof typeof TABLE_CATEGORIES]?.label || category)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Sort By</label>
                <div className="flex gap-2 mt-2">
                  {(['name', 'rows', 'columns'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        sortBy === option
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {option === 'name' ? 'Name' : option === 'rows' ? 'Rows' : 'Columns'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tables ({filteredAndSortedTables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedTables.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No tables found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-2 border rounded-lg divide-y">
              {filteredAndSortedTables.map((table) => (
                <div key={table.name} className="p-4 hover:bg-muted/30 transition-colors">
                  <div 
                    className="flex items-center justify-between gap-4 cursor-pointer"
                    onClick={() => toggleRowExpanded(table.name)}
                  >
                    <div className="flex-1 flex items-center gap-4">
                      <button className="hover:bg-muted/80 rounded p-1">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedRows.has(table.name) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold font-mono text-sm truncate">{table.name}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-1">{table.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm">{table.rowCount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">rows</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{table.columns.length}</p>
                        <p className="text-xs text-muted-foreground">columns</p>
                      </div>
                      <Badge className={getCategoryBadgeColor(table.category)} variant="outline">
                        {TABLE_CATEGORIES[table.category as keyof typeof TABLE_CATEGORIES]?.label || table.category}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        disabled={table.rowCount === 0 || dataLoading}
                        onClick={() => {
                          const tableInfo = DATABASE_TABLES.find(t => t.name === table.name);
                          if (tableInfo) {
                            fetchTableData(tableInfo, 1);
                          }
                        }}
                      >
                        {dataLoading ? <Spinner className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {expandedRows.has(table.name) && (
                    <div className="mt-4 ml-10 space-y-4 pt-4 border-t">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Display Name</h4>
                        <p className="text-sm text-muted-foreground">{table.displayName}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">Columns ({table.columns.length})</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {table.columns.map((col) => (
                            <Badge key={col} variant="secondary" className="font-mono text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2"
                          disabled={table.rowCount === 0 || dataLoading}
                          onClick={() => {
                            const tableInfo = DATABASE_TABLES.find(t => t.name === table.name);
                            if (tableInfo) {
                              fetchTableData(tableInfo, 1);
                            }
                          }}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
