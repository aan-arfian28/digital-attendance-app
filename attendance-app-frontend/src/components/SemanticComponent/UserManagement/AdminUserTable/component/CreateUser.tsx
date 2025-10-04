import { useModal } from "../../../../../hooks/useModal";
import React, { useState } from "react";
import axios from 'axios';
import { Modal } from "../../../../ui/modal";
import Button from "../../../../ui/button/Button";
import Input from "../../../../form/input/InputField";
import Label from "../../../../form/Label";

interface FormattedUserData {
    Username: string,
    Email: string,
    Password?: string
    Role: {
        Name: string,
        Position: string,
        PositionLevel: number
    };
    UserDetail: {
        Name?: string
    };    
}   

//fuck TS is so stingy
interface CreateUserProps {
    RoleData: string,
    OnSendData: (childReturn:any) =>  void,
}

export default function CreateUser({RoleData, OnSendData }:CreateUserProps) {
    const { isOpen, openModal, closeModal } = useModal();
    const [FormData, setFormData] = useState<FormattedUserData>({
        Username: "",
        Password: "",
        Email: "",
        Role: {
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

    // Define which keys in your interface hold nested objects
    type NestedObjectKeys = 'Role' | 'UserDetail';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const path = name.split('.');

        if (path.length === 1) {
            // Handle top-level properties (e.g., name="Username")
            setFormData((prevData) => ({
                ...prevData,
                [name]: value,
            }));
        } else if (path.length === 2) {
            // THE FIX: We tell TypeScript that outerKey will be one of our nested object keys.
            const [outerKey, innerKey] = path as [NestedObjectKeys, string];

            setFormData((prevData) => {
                const finalValue = innerKey === 'PositionLevel' ? parseInt(value, 10) || 0 : value;

                return {
                    ...prevData,
                    [outerKey]: {
                        // Now TypeScript knows prevData[outerKey] must be an object, so the error is gone.
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
          throw new Error("User information not found in local storage.");
        }
        
        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        if (!bearerToken) {
          throw new Error("Authentication token not found.");
        }
        console.log(`Bearer ${bearerToken}`);
        
        try {
        const response = await axios.post(
            API_URL, 
            FormData,
            {
                headers: {
                'Authorization': `Bearer ${bearerToken}`
                }
            }
            // Check for success
        );
        if (response.status === 201) {
            OnSendData({}); 
        }

        const result = await response;
        console.log("Update successful:", result);
        closeModal();
        } catch (err: any) {
        console.error("Failed to update user:", err);
        setError(err.message || "An unexpected error occurred.");
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
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
                                <Input type="text" name="Password" id="PasswordName" value={FormData.Password} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="Position">Position</Label>
                                <Input type="text" name="Role.Position" id="Position" value={FormData.Role.Position} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="PositionLevel">Position Level</Label>
                                <Input type="number" name="Role.PositionLevel" id="PositionLevel" value={FormData.Role.PositionLevel} onChange={handleInputChange} />
                            </div>
                            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                    <Button size="sm" variant="outline" onClick={closeModal} type="button">
                        Close
                    </Button>
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
