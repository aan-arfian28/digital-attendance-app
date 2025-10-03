import { useState, useEffect } from 'react';
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

// A new, more appropriate interface for the formatted data to be displayed in the table
interface ApiRole {
    ID: number;
    Name: string;
    Position: string;
    PositionLevel: number;
}

function AdminRoleTableAdmins() {
  const [apiData, setApiData] = useState<ApiRole[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const endpoint = "http://localhost:8080/api/admin/users"

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

        const urlWithCacheBuster = `${endpoint}/roles?t=${refreshTrigger}`;

        const response = await axios.get<ApiRole[]>(
          urlWithCacheBuster, {
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
    console.log(apiData)
  }, [refreshTrigger]);

  if (!Array.isArray(apiData)) {
    return [];
  }

  if (loading) return <div>Loading...</div>;
  // if (error) return <div>Error: {error.message}</div>;

  return (
    
    <div>
      <div className="flex items-center justify-end my-2">     
        {/* New Button Placeholder */}
          <CreateRole OnSendData={handleUserUpdate}/>
      </div>
      {error && <p className="my-4 text-sm text-red-500">{error.message}</p>}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
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
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {apiData.map((roleItem) => (
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