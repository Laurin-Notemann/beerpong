import React, { createContext, ReactNode, useContext, useState } from 'react';

import { Logs } from './logging';

export type Log = { data: Logs; date: Date };

type LoggingContextType = {
    logs: Log[];
    writeLog: (...args: Logs) => void;
};

const LoggingContext = createContext<LoggingContextType | undefined>(undefined);

export const LoggingProvider = ({ children }: { children: ReactNode }) => {
    const [logs, setLogs] = useState<Log[]>([]);
    const writeLog = (...data: Logs) =>
        setLogs((prev) => [...prev, { data, date: new Date() }]);
    return (
        <LoggingContext.Provider value={{ logs, writeLog }}>
            {children}
        </LoggingContext.Provider>
    );
};

export const useLogging = () => {
    const context = useContext(LoggingContext);
    if (!context)
        throw new Error('useLogging must be used within a LoggingProvider');
    return context;
};
