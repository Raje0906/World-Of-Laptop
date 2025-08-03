import React from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PriceHistoryEntry {
  repairCost: number;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  updatedAt: string | Date;
  updatedBy?: {
    name?: string;
    email?: string;
  };
}

interface PriceHistoryProps {
  history: PriceHistoryEntry[];
  className?: string;
}

export function PriceHistory({ history, className = '' }: PriceHistoryProps) {
  if (!history || history.length === 0) {
    return null;
  }

  // Sort history by date (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg">Price History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="text-right">Repair</TableHead>
              <TableHead className="text-right">Parts</TableHead>
              <TableHead className="text-right">Labor</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Updated By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedHistory.map((entry, index) => (
              <TableRow key={index} className={index === 0 ? 'bg-muted/50' : ''}>
                <TableCell className="font-medium">
                  {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(entry.updatedAt), 'h:mm a')}
                  </div>
                </TableCell>
                <TableCell className="text-right">₹{entry.repairCost?.toFixed(2) || '0.00'}</TableCell>
                <TableCell className="text-right">₹{entry.partsCost?.toFixed(2) || '0.00'}</TableCell>
                <TableCell className="text-right">₹{entry.laborCost?.toFixed(2) || '0.00'}</TableCell>
                <TableCell className="text-right font-semibold">
                  ₹{entry.totalCost?.toFixed(2) || '0.00'}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {entry.updatedBy?.name || entry.updatedBy?.email || 'System'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
