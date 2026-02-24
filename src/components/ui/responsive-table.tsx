import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ResponsiveTableProps {
  headers: string[];
  data: Array<{
    id: string | number;
    cells: ReactNode[];
    mobileCard?: ReactNode;
  }>;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const ResponsiveTable = ({ 
  headers, 
  data, 
  loading = false, 
  emptyMessage = "No data available",
  className = ""
}: ResponsiveTableProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <Table className={className}>
            <TableHeader>
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {headers.map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <div className="h-6 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="card-cyber">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className={className}>
          <TableHeader>
            <TableRow className="border-primary/20">
              {headers.map((header, index) => (
                <TableHead key={index}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow 
                key={row.id} 
                className="border-primary/10 hover:bg-primary/5 transition-colors"
              >
                {row.cells.map((cell, index) => (
                  <TableCell key={index}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row) => (
          <Card key={row.id} className="card-cyber">
            <CardContent className="p-4">
              {row.mobileCard || (
                <div className="space-y-2">
                  {row.cells.map((cell, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground font-medium">
                        {headers[index]}:
                      </span>
                      <div className="text-sm">{cell}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};