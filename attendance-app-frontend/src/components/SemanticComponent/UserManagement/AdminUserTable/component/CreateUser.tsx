import { useModal } from "../../../../../hooks/useModal";
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Modal } from "../../../../ui/modal";
import Button from "../../../../ui/button/Button";
import Input from "../../../../form/input/InputField";
import Label from "../../../../form/Label";
import Select from "../../../../form/Select";

// The main data structure for the form
interface FormattedUserData {
    Username: string;
    Email: string;
    Password?: string; // Password can be optional on create
    Role: {
        ID: number;
        Name: string;
        Position: string;
        PositionLevel: number;
    };
    UserDetail: {
        Name?: string;
    };
    SupervisorID?: number; // Optional Supervisor ID
}

// Generic interface for dropdown options
interface Option {
    value: string;
    label: string;
}

// Structure for a role from the API
interface RoleData {
    ID: number;
    Name: string;
    Position: string;
    PositionLevel: number;
}

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


//fuck TS is so stingy
interface CreateUserProps {
    RoleData: string,
    OnSendData: (childReturn: any) => void,
}

export default function CreateUser({ RoleData, OnSendData }: CreateUserProps) {
    const { isOpen, openModal, closeModal } = useModal();
    const [FormData, setFormData] = useState<FormattedUserData>({
        Username: "",
        Password: "",
        Email: "",
        Role: {
            ID: 0,
            Name: RoleData,
            Position: "",
            PositionLevel: 0
        },
        UserDetail: {
            Name: ""
        }
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for role selection
    const [allRoles, setAllRoles] = useState<RoleData[]>([]);
    const [roleOptions, setRoleOptions] = useState<Option[]>([]);

    // NEW: State for supervisor selection
    const [allPotentialSupervisors, setAllPotentialSupervisors] = useState<SupervisorData[]>([]);
    const [supervisorOptions, setSupervisorOptions] = useState<Option[]>([]);

    // Combined useEffect to fetch initial data when the modal opens
    useEffect(() => {
        if (isOpen) {
            handleGetRole();
            handleGetUsersForSupervisor();
        }
    }, [isOpen]);
    
    // NEW: useEffect to filter supervisors whenever the selected role changes
    useEffect(() => {
        // A supervisor's position level should be numerically smaller (higher rank) than the new user's role.
        if (FormData.Role.PositionLevel > 0 && allPotentialSupervisors.length > 0) {
            const filteredSupervisors = allPotentialSupervisors.filter(
                supervisor => supervisor.PositionLevel < FormData.Role.PositionLevel
            );
            console.log(allPotentialSupervisors)
            console.log(allPotentialSupervisors[0].PositionLevel, FormData.Role.PositionLevel, allPotentialSupervisors[0].PositionLevel < FormData.Role.PositionLevel, filteredSupervisors)

            const options = filteredSupervisors.map(supervisor => ({
                value: supervisor.ID.toString(),
                label: `${supervisor.Name} - ${supervisor.Position}`
            }));
            setSupervisorOptions(options);
        } else {
            setSupervisorOptions([]); // Reset if no role is selected or supervisors haven't loaded
        }
    }, [FormData.Role, allPotentialSupervisors]);


    type NestedObjectKeys = 'Role' | 'UserDetail';

    const handleRoleSelectChange = (selectedRoleId: string) => {
        const selectedRole = allRoles.find(role => role.ID.toString() === selectedRoleId);
        if (selectedRole) {
            setFormData(prevData => ({
                ...prevData,
                Role: {
                    ID: selectedRole.ID,
                    Name: selectedRole.Name,
                    Position: selectedRole.Position,
                    PositionLevel: selectedRole.PositionLevel,
                },
                // NEW: Reset supervisor when role changes
                SupervisorID: undefined 
            }));
        }
    };

    // NEW: Handler for supervisor selection change
    const handleSupervisorSelectChange = (selectedSupervisorId: string) => {
        setFormData(prevData => ({
            ...prevData,
            SupervisorID: parseInt(selectedSupervisorId, 10) || undefined
        }));
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

            const options = roles.filter(role => role.Name === RoleData)
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

    // UPDATED: Renamed and corrected the function to fetch users
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
            if (response.data){
                setAllPotentialSupervisors(response.data);
            } else {
                setAllPotentialSupervisors([]);
            }
            console.log(response)
        } catch (err) {
            console.error("Failed to fetch users for supervisor list:", err);
            setError("Could not load user data for supervisor selection.");
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const path = name.split('.');

        if (path.length === 1) {
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        } else if (path.length === 2) {
            const [outerKey, innerKey] = path as [NestedObjectKeys, string];
            setFormData((prevData) => {
                const finalValue = innerKey === 'PositionLevel' ? parseInt(value, 10) || 0 : value;
                return {
                    ...prevData,
                    [outerKey]: {
                        ...prevData[outerKey],
                        [innerKey]: finalValue,
                    },
                };
            });
        }
    };


    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const API_URL = `http://localhost:8080/api/admin/users/`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) {
            setError("User information not found in local storage.");
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
            const response = await axios.post(
                API_URL,
                FormData,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );
            if (response.status === 201) {
                OnSendData({});
                closeModal();
            }
        } catch (err: any) {
            console.error("Failed to create user:", err);
            const errorMessage = err.response?.data?.message || err.message || "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div>
            <button
                onClick={openModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-green-300 bg-emerald-300 px-4 py-1 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-green-800 dark:bg-emerald-600 dark:text-gray-200 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" >
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create User
            </button>
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
                <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Create User
                        </h4>
                    </div>
                    <form className="flex flex-col" onSubmit={handleUpdate}>
                        <div className="px-2 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div>
                                    <Label htmlFor="Name">Full Name</Label>
                                    <Input type="text" name="UserDetail.Name" id="Name" value={FormData.UserDetail.Name} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Username">Username</Label>
                                    <Input type="text" name="Username" id="Username" value={FormData.Username} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Email">Email</Label>
                                    <Input type="text" name="Email" id="Email" value={FormData.Email} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <Label htmlFor="Password">Password</Label>
                                    <Input type="text" name="Password" id="Password" value={FormData.Password} onChange={handleInputChange} />
                                </div>
                                <div className="lg:col-span-2">
                                    <Label>User Role</Label>
                                    <Select
                                        options={roleOptions}
                                        placeholder="Select a role"
                                        onChange={handleRoleSelectChange}
                                        defaultValue={''}
                                        className="dark:bg-dark-900"
                                    />
                                </div>


                                <div>
                                    <Label htmlFor="Position">Position</Label>
                                    <Input disabled type="text" name="Position" id="Position" value={FormData.Role.Position} />
                                </div>
                                <div>
                                    <Label htmlFor="PositionLevel">Position Level</Label>
                                    <Input disabled type="number" name="PositionLevel" id="PositionLevel" value={FormData.Role.PositionLevel} />
                                </div>
                                {/* NEW: Supervisor Select Input */}
                                {(supervisorOptions.length > 0 && RoleData !== 'admin') && (
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

                                {error && <p className="col-span-2 mt-2 text-sm text-red-500">{error}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={closeModal} type="button">
                                Close
                            </Button>
                            <Button size="sm" disabled={isSubmitting} type="submit">
                                {isSubmitting ? 'Creating User...' : 'Create User'}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
