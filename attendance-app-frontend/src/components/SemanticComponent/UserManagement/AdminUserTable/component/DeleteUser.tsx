import { useState, useEffect } from "react";
import axios from 'axios';

interface FormattedUserData {
    ID: number;
    Name: string;
    Role: string;
    Position: string;
    PositionLevel : number;
    Username: string;
    Password?: string
}   

//fuck TS is so stingy
interface DeleteUserProps {
  UserData: FormattedUserData;
  OnSendData: (childReturn:any) => void;
}

export default function DeleteUser({ UserData, OnSendData }:DeleteUserProps) {
    const [FormData, setFormData] = useState<FormattedUserData>(UserData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        setFormData(UserData);
    }, [UserData]);

    const handleUpdate = async () => {
        setIsSubmitting(true);

        // This setup can be outside the try block
        const API_URL = `http://localhost:8080/api/admin/users/${FormData.ID}`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) {
            // You should handle this more gracefully than throwing an error
            const msg = "User information not found in local storage.";
            OnSendData({ "err": msg });
            setIsSubmitting(false);
            return;
        }
        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        
        try {
            const response = await axios.delete(API_URL, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });

            // If axios does not throw an error, it was successful (status 2xx).
            console.log("Delete successful:", response.data);
            OnSendData({}); // Call the callback on success

        } catch (err: any) {
            console.error("Failed to Delete user:", err);
            // Get the specific error message from the API response if it exists
            OnSendData({ "err": err }); // Pass the actual error message back
        } finally {
            setIsSubmitting(false);
        }
    };  

    return (
        <div>
            <button
            onClick={handleUpdate}
            disabled={isSubmitting}
            className={`
            flex w-full items-center justify-center gap-2 rounded-full border 
            border-red-400 bg-red-300 px-4 py-1 text-sm font-medium text-gray-700 
            shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-red-700 
            dark:bg-red-800 dark:text-gray-200 dark:hover:bg-white/[0.03] 
            dark:hover:text-gray-200 lg:inline-flex lg:w-auto
            ${ isSubmitting ? "cursor-not-allowed opacity-50" : "" }
            `}
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
            Delete
            </button>
        </div>
    );
}
