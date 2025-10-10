import { useModal } from "../../../../../hooks/useModal";
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Modal } from "../../../../ui/modal";
import Button from "../../../../ui/button/Button";
import Input from "../../../../form/input/InputField";
import Select from "../../../../form/Select";
import Label from "../../../../form/Label";

// Define the structure for a select option
interface Option {
    value: string;
    label: string;
}

// Define the structure for a role from the API
interface RoleData {
    ID: number;
    Name: string;
    Position: string;
    PositionLevel: number;
}

// Main data structure for the form's state
interface FormattedUserData {
    ID: number;
    Name: string;
    Email: string;
    Username: string;
    Password?: string;
    RoleID: number;
    Role: string;
    Position: string;
    PositionLevel: number;
    SupervisorID?: number;
}

// Structure for potential supervisors from the API
interface SupervisorData {
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

interface EditUserProps {
    UserData: FormattedUserData;
    OnSendData: (childReturn: any) => void;
}

export default function EditUser({ UserData, OnSendData }: EditUserProps) {
    const { isOpen, openModal, closeModal } = useModal();
    
    // Initialize form state from props, ensuring password is blank
    const [FormData, setFormData] = useState<FormattedUserData>({ ...UserData, Password: "" });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for roles
    const [allRoles, setAllRoles] = useState<RoleData[]>([]);
    const [roleOptions, setRoleOptions] = useState<Option[]>([]);

    // State for supervisors
    const [allPotentialSupervisors, setAllPotentialSupervisors] = useState<SupervisorData[]>([]);
    const [supervisorOptions, setSupervisorOptions] = useState<Option[]>([]);

    // Sync form state if the initial UserData prop changes
    useEffect(() => {
        setFormData({ ...UserData, Password: "" });
    }, [UserData]);
    
    // Fetch roles and users when the modal opens
    useEffect(() => {
        if (isOpen) {
            handleGetRole();
            handleGetUsersForSupervisor();
        }
    }, [isOpen]);

    // Re-calculate available supervisors when the user's role or the list of users changes
    useEffect(() => {
        if (FormData.PositionLevel > 0 && allPotentialSupervisors.length > 0) {
            const filteredSupervisors = allPotentialSupervisors.filter(
                supervisor => 
                    // Supervisor must have a higher rank (lower level number)
                    supervisor.PositionLevel < FormData.PositionLevel &&
                    // A user cannot be their own supervisor
                    supervisor.ID !== FormData.ID
            );

            const options = filteredSupervisors.map(supervisor => ({
                value: supervisor.ID.toString(),
                label: `${supervisor.Name || supervisor.Username} - ${supervisor.Position}`
            }));
            setSupervisorOptions(options);
        } else {
            setSupervisorOptions([]);
        }
    }, [FormData.PositionLevel, allPotentialSupervisors, FormData.ID]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleRoleSelectChange = (selectedRoleId: string) => {
        const selectedRole = allRoles.find(role => role.ID.toString() === selectedRoleId);
        if (selectedRole) {
            setFormData(prevData => ({
                ...prevData,
                RoleID: selectedRole.ID,
                Role: selectedRole.Name,
                Position: selectedRole.Position,
                PositionLevel: selectedRole.PositionLevel,
                SupervisorID: undefined, // Reset supervisor when role changes
            }));
        }
    };

    const handleSupervisorSelectChange = (selectedSupervisorId: string) => {
        setFormData(prevData => ({
            ...prevData,
            SupervisorID: parseInt(selectedSupervisorId, 10) || undefined
        }));
    };

    const reformatDataForAPI = (data: FormattedUserData) => {
        const payload: any = {
            Name: data.Name,
            Username: data.Username,
            Email: data.Email,
            RoleID: data.RoleID,
        };

        // Only include SupervisorID if it has a value
        if (data.SupervisorID) {
            payload.SupervisorID = data.SupervisorID;
        }

        // Only include password in the payload if it's been changed
        if (data.Password && data.Password.trim().length > 0) {
            payload.Password = data.Password;
        }

        return payload;
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        const API_URL = `http://localhost:8080/api/admin/users/${FormData.ID}`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) {
            setError("User information not found.");
            setIsSubmitting(false);
            return;
        }
        
        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        if (!bearerToken) {
            setError("Authentication token not found.");
            setIsSubmitting(false);
            return;
        }
        
        try {
            const response = await axios.put(
                API_URL, 
                reformatDataForAPI(FormData),
                { headers: { 'Authorization': `Bearer ${bearerToken}` } }
            );
            if (response.status === 200) {
                OnSendData({}); 
                closeModal();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGetRole = async () => {
        const API_URL = `http://localhost:8080/api/admin/users/roles/`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) return;
        
        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        if (!bearerToken) return;

        try {
            const response = await axios.get<RoleData[]>(API_URL, {
                headers: { 'Authorization': `Bearer ${bearerToken}` }
            });
            const roles = response.data;
            setAllRoles(roles);

            // Populate dropdown with all available roles
            const options = roles.filter(role => role.Name === UserData.Role)
            .map(role => ({
                value: role.ID.toString(),
                label: `${role.Name} - ${role.Position} (Lvl ${role.PositionLevel})`
            }));
            setRoleOptions(options);

        } catch (err) {
            console.error("Failed to fetch roles:", err);
            setError("Could not load role data.");
        }
    }

    const handleGetUsersForSupervisor = async () => {
        const API_URL = `http://localhost:8080/api/admin/users/non-admins`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) return;

        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        if (!bearerToken) return;

        try {
            const response = await axios.get<SupervisorData[]>(API_URL, {
                headers: { 'Authorization': `Bearer ${bearerToken}` }
            });
            setAllPotentialSupervisors(response.data);
        } catch (err) {
            console.error("Failed to fetch users for supervisor list:", err);
            setError("Could not load user data for supervisor selection.");
        }
    }

    return (
        <div>
            <button
                onClick={openModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300 bg-amber-200 px-4 py-1 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-yellow-800 dark:bg-yellow-600 dark:text-gray-200 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
               <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""/></svg>
                Edit
            </button>
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
                <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Edit User Data</h4>
                    </div>
                    <form className="flex flex-col" onSubmit={handleUpdate}>
                        <div className="px-2 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div>
                                    <Label htmlFor="Name">Full Name</Label>
                                    <Input type="text" name="Name" id="Name" value={FormData.Name} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Username">Username</Label>
                                    <Input type="text" name="Username" id="Username" value={FormData.Username} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Email">Email</Label>
                                    <Input type="email" name="Email" id="Email" value={FormData.Email} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Password">New Password (optional)</Label>
                                    <Input type="password" name="Password" id="Password" value={FormData.Password} onChange={handleInputChange} placeholder="Leave blank to keep current"/>
                                </div>
                                
                                <div className="lg:col-span-2">
                                    <Label>User Role</Label>
                                    <Select
                                        options={roleOptions}
                                        placeholder="Select a new role"
                                        onChange={handleRoleSelectChange}
                                        defaultValue={FormData.RoleID?.toString() ?? ''}
                                        className="dark:bg-dark-900"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="Position">Position</Label>
                                    <Input disabled type="text" name="Position" id="Position" value={FormData.Position} />
                                </div>
                                <div>
                                    <Label htmlFor="PositionLevel">Position Level</Label>
                                    <Input disabled type="number" name="PositionLevel" id="PositionLevel" value={FormData.PositionLevel} />
                                </div>

                                {(supervisorOptions.length > 0 && UserData.Role == 'user') && (
                                    <div className="lg:col-span-2">
                                        <Label>Supervisor (Optional)</Label>
                                        <Select
                                            options={supervisorOptions}
                                            placeholder="Select a supervisor"
                                            onChange={handleSupervisorSelectChange}
                                            defaultValue={FormData.SupervisorID?.toString() ?? ''}
                                            className="dark:bg-dark-900"
                                        />
                                    </div>
                                )}
                                
                                {error && <p className="mt-4 text-sm text-red-500 lg:col-span-2">{error}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={closeModal} type="button">Close</Button>
                            <Button size="sm" disabled={isSubmitting} type="submit">
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}