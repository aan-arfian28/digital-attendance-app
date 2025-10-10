import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../ui/table";
import  EditUser  from "./component/EditUser";
import  DeleteUser  from "./component/DeleteUser";
import  CreateUser  from "./component/CreateUser";

// Interface for the raw data structure from the API
interface ApiUser {
  ID: number;
  Name?: string;
  Username: string;
  Email: string;
  RoleID: number
  Role:  string;
  Position: string;
  PositionLevel: number;
  Supervisor?: {
    ID: number;
    SupervisorName: string;
  }
}

// A new, more appropriate interface for the formatted data to be displayed in the table
interface FormattedAdminUser {
  ID: number;
  Name: string;
  Username: string;
  Email: string;
  RoleID: number;
  Role: string;
  Position: string;
  PositionLevel : number;
  SupervisorName: string | null;
}

export default function AdminUserTableAdmins() {
  const [apiData, setApiData] = useState<ApiUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const endpoint = "http://localhost:8080/api/admin/users"
  const role = "user";

  const handleUserUpdate = (childReturn: any) => {
    console.log(childReturn)
    console.log("childReturn.err", childReturn.err)
    childReturn.err ? (() => {setError(childReturn.err)})() : null;
    setRefreshTrigger(prev => prev + 1);
  }

  useEffect(() => {
    const fetchData = async () => {
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

        const response = await axios.get<ApiUser[]>(
          endpoint + '/non-admins', {
            headers: {
              'Authorization': `Bearer ${bearerToken}`
            }
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
  }, [refreshTrigger]); // Empty dependency array ensures this effect runs only once on mount
  console.log("apidata :",apiData)

  // useMemo to transform the API data into the structure needed for the table
  const formattedTableData: FormattedAdminUser[] = useMemo(() => {
    if (!Array.isArray(apiData)) {
      return [];
    }

    // Map the raw API data to the 'FormattedAdminUser' interface structure
    return apiData.map((apiItem) => ({
      ID: apiItem.ID,
      Name: apiItem.Name || 'N/A', // Safely access optional name
      Username: apiItem.Username,
      Email: apiItem.Email,
      RoleID: apiItem.RoleID,
      Role: apiItem.Role,
      Position: apiItem.Position,
      PositionLevel: apiItem.PositionLevel,
      SupervisorName: apiItem.Supervisor?.SupervisorName || 'N/A'
    }));
  }, [apiData]);

  if (loading) return <div>Loading...</div>;
  // if (error) return <div>Error: {error.message}</div>;

  return (
    
    <div>
      <div className="flex items-center justify-end my-2">     
        {/* New Button Placeholder */}
          <CreateUser RoleData={role} OnSendData={handleUserUpdate}/>
      </div>
      {error && <p className="my-4 text-sm text-red-500">{error.message}</p>}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  User
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Email
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Role
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Position
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Position Level
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Supervisor
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {formattedTableData.map((user) => (
                <TableRow key={user.ID}>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {user.Name}
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {user.Email}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {user.Role}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {user.Position}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {user.PositionLevel}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    {user.SupervisorName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                    <div className="flex flex-col gap-2 lg:flex-row">
                      <EditUser UserData={user} OnSendData={handleUserUpdate}/>
                      <DeleteUser UserData={user} OnSendData={handleUserUpdate}/>
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