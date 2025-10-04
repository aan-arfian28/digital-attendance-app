import { useModal } from "../../../../../hooks/useModal";
import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Modal } from "../../../../ui/modal";
import Button from "../../../../ui/button/Button";
import Input from "../../../../form/input/InputField";
import Select from "../../../../form/Select";
import Label from "../../../../form/Label";

interface FormattedUserData {
    ID: number;
    Name: string;
    Email: string;
    Username: string;
    Password?: string
    RoleName: string;
    Position: string;
    PositionLevel : number;
}   

//fuck TS is so stingy
interface EditUserProps {
    UserData: FormattedUserData;
    OnSendData: (childReturn:any) =>  void ;
}

export default function EditUser({ UserData, OnSendData }:EditUserProps) {
    const { isOpen, openModal, closeModal } = useModal();
    UserData.Password = ""
    const [FormData, setFormData] = useState<FormattedUserData>(UserData);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        setFormData(UserData);
    }, [UserData]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };
    
    const reformatDataAPI = (OriginalData: FormattedUserData) => {
        // 1. Create the base object
        const basePayload = {
            Username: OriginalData.Username,
            Role: {
                Name: OriginalData.RoleName,
                Position: OriginalData.Position,
                PositionLevel: typeof OriginalData.PositionLevel === 'string'
                    ? parseInt(OriginalData.PositionLevel, 10)
                    : OriginalData.PositionLevel,
            },
            UserDetail: {
                Name: OriginalData.Name,
            },
        };

        // 2. Conditionally add the Password property using the spread syntax
        // This is the cleanest way to handle optional properties in an object literal.
        const reformatted = {
            ...basePayload,
            // The spread syntax conditionally adds the 'Password' property ONLY if
            // OriginalData.Password is a non-empty, truthy string.
            ...(OriginalData.Password && OriginalData.Password.length > 0 && {
                Password: OriginalData.Password
            })
        };

        return reformatted;
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        
        const API_URL = `http://localhost:8080/api/admin/users/${FormData.ID}`;
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
            const response = await axios.put(
                API_URL, 
                reformatDataAPI(FormData),
                {
                    headers: {
                    'Authorization': `Bearer ${bearerToken}`
                    }
                }
                // Check for success
            );
            if (response.status === 200) {
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
            className="flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300 bg-amber-200 px-4 py-1 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-yellow-800 dark:bg-yellow-600 dark:text-gray-200 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
            <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
                />
            </svg>
            Edit
            </button>
            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
                <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
                <div className="px-2 pr-14">
                    <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                    Edit User Data
                    </h4>
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
                                <Input type="Email" name="Email" id="Email" value={FormData.Email} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="Password">Password</Label>
                                <Input type="text" name="Password" id="Password" value={FormData.Password} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="Position">Position</Label>
                                <Input disabled type="text" name="Role.Position" id="Position" value={FormData.Position} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="PositionLevel">Position Level</Label>
                                <Input disabled type="number" name="Role.PositionLevel" id="PositionLevel" value={FormData.PositionLevel} onChange={handleInputChange} />
                            </div>
                            {/* <div>
                                <Label>Select Input</Label>
                                <Select
                                    options={options}
                                    placeholder="Select an option"
                                    onChange={handleSelectChange}
                                    className="dark:bg-dark-900"
                                />
                            </div> */}
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
