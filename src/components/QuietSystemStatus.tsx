import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useQuietHealth } from "../hooks/useQuietHealth";
import { Wifi, WifiOff, RefreshCw, Database, Server } from "lucide-react";

export default function QuietSystemStatus() {
  const { isConnected, lastCheck, checking, checkHealth } = useQuietHealth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-yellow-500" />
          )}
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Backend API</span>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={
              isConnected
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-yellow-100 text-yellow-800 border-yellow-200"
            }
          >
            {isConnected ? "Connected" : "Offline"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Database</span>
          <Badge
            variant="secondary"
            className={
              isConnected
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-yellow-100 text-yellow-800 border-yellow-200"
            }
          >
            <Database className="h-3 w-3 mr-1" />
            {isConnected ? "MongoDB" : "Demo Mode"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Data Source</span>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={
              isConnected
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : "bg-gray-100 text-gray-800 border-gray-200"
            }
          >
            <Server className="h-3 w-3 mr-1" />
            {isConnected ? "Real Database" : "Local Storage"}
          </Badge>
        </div>

        {lastCheck && (
          <div className="text-xs text-gray-500">
            Last checked: {lastCheck.toLocaleTimeString()}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={checking}
          className="w-full"
        >
          {checking ? (
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-2" />
          )}
          Check Connection
        </Button>

        {!isConnected && (
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <strong>Demo Mode:</strong> Backend server is not running. All data
            is stored locally. Start MongoDB and backend server to enable
            database features.
          </div>
        )}

        {isConnected && (
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            <strong>Connected:</strong> All features are available with real
            database persistence.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
