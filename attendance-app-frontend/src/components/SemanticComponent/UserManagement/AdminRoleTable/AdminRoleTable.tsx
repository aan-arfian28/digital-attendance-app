import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../../ui/table";
import  EditRole  from "./component/EditRole";
import  DeleteRole  from "./component/DeleteRole";
import  CreateRole  from "./component/CreateRole";

// Interface for the role data
interface ApiRole {
    ID: number;
    Name: string;
    Position: string;
    PositionLevel: number;
}

// Type for our sort configuration
type SortConfig = {
    key: keyof ApiRole;
    direction: 'ascending' | 'descending';
};

function AdminRoleTableAdmins() {
    const [apiData, setApiData] = useState<ApiRole[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [warn, setWarn] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // --- STATE FOR SORTING ---
    // Default sort is by PositionLevel, ascending.
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'PositionLevel', direction: 'ascending' });

    const endpoint = "http://localhost:8080/api/admin/users";

    const handleUserUpdate = (childReturn: any) => {
        // Clear previous messages on new action
        setError(null);
        setWarn(null);

        if (childReturn.err) {
            setError(childReturn.err);
        }
        if (childReturn.warn) {
            setWarn(childReturn.warn);
        }
        // Trigger a data refresh
        setRefreshTrigger(prev => prev + 1);
    }

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const userInfo = localStorage.getItem('user');
                if (!userInfo) {
                    throw new Error("User information not found in local storage.");
                }
                
                const userObject = JSON.parse(userInfo);
                const bearerToken = userObject?.token;

                if (!bearerToken) {
                    throw new Error("Authentication token not found.");
                }

                const response = await axios.get<ApiRole[]>(
                    endpoint + '/roles/', {
                        headers: { 'Authorization': `Bearer ${bearerToken}` }
                    }
                );
                setApiData(response.data);
            } catch (err: any) {
                setError(err);
                console.error("Failed to fetch admin users:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [refreshTrigger]);

    // --- MEMOIZED SORTING LOGIC ---
    const sortedApiData = useMemo(() => {
        if (!apiData) return [];

        const sortableData = [...apiData]; // Create a mutable copy
        
        sortableData.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return sortableData;
    }, [apiData, sortConfig]);

    // --- CLICK HANDLER FOR TABLE HEADERS ---
    const requestSort = (key: keyof ApiRole) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        // If clicking the same column, toggle direction
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Helper to get sort indicator
    const getSortIndicator = (columnKey: keyof ApiRole) => {
        if (sortConfig.key !== columnKey) {
            return null; // No indicator
        }
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };


    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div className="flex items-center justify-end my-2">    
                <CreateRole OnSendData={handleUserUpdate}/>
            </div>
            {/* Display error/warning messages */}
            {error && <p className="my-4 text-sm text-red-500">{error.message}</p>}
            {warn && <p className="my-4 text-sm text-yellow-500">{warn}</p>}

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                            <TableRow>
                                {/* --- UPDATED CLICKABLE HEADERS --- */}
                                <TableCell isHeader onClick={() => requestSort('Name')} className="px-5 py-3 font-medium text-gray-500 cursor-pointer select-none text-start text-theme-xs dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                                    Role{getSortIndicator('Name')}
                                </TableCell>
                                <TableCell isHeader onClick={() => requestSort('Position')} className="px-5 py-3 font-medium text-gray-500 cursor-pointer select-none text-start text-theme-xs dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                                    Position{getSortIndicator('Position')}
                                </TableCell>
                                <TableCell isHeader onClick={() => requestSort('PositionLevel')} className="px-5 py-3 font-medium text-gray-500 cursor-pointer select-none text-start text-theme-xs dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                                    Position Level{getSortIndicator('PositionLevel')}
                                </TableCell>
                                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                            {/* --- RENDER THE SORTED DATA --- */}
                            {sortedApiData.map((roleItem) => (
                                <TableRow key={roleItem.ID}>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {roleItem.Name}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {roleItem.Position}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        {roleItem.PositionLevel}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                        <div className="flex flex-col gap-2 lg:flex-row">
                                            <EditRole UserData={roleItem} MoveDirection={'up'} OnSendData={handleUserUpdate}/>
                                            <EditRole UserData={roleItem} MoveDirection={'down'} OnSendData={handleUserUpdate}/>
                                            <DeleteRole  UserData={roleItem}  OnSendData={handleUserUpdate}/>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

export default AdminRoleTableAdmins;
