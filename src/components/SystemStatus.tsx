import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useApiHealth } from "../hooks/useApi";
import { Wifi, WifiOff, RefreshCw, Database, Server } from "lucide-react";

export default function SystemStatus() {
  const { isConnected, lastCheck, loading, error, checkHealth } =
    useApiHealth();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Backend API</span>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className={
              isConnected
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-red-100 text-red-800 border-red-200"
            }
          >
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Database</span>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 border-orange-200"
          >
            <Database className="h-3 w-3 mr-1" />
            Local Mode
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Server</span>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={
              isConnected
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : "bg-gray-100 text-gray-800 border-gray-200"
            }
          >
            <Server className="h-3 w-3 mr-1" />
            {isConnected ? "Running" : "Offline"}
          </Badge>
        </div>

        {lastCheck && (
          <div className="text-xs text-gray-500">
            Last checked: {lastCheck.toLocaleTimeString()}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={checkHealth}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-2" />
          )}
          Check Connection
        </Button>

        {!isConnected && (
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <strong>Demo Mode:</strong> Using local storage. Start MongoDB and
            run the backend server to enable full functionality.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
