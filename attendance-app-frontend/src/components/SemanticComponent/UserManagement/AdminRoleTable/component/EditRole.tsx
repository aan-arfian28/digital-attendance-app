import { useState, useEffect } from "react";
import axios from 'axios';

interface FormattedUserData {
    ID: number;
    Name: string;
    Position: string;
    PositionLevel : number;
}   

//fuck TS is so stingy
interface EditUserProps {
  UserData: FormattedUserData;
  MoveDirection: "up" | "down";
  OnSendData: (childReturn:any) => void;
}

export default function EditRole({ UserData, MoveDirection, OnSendData }:EditUserProps) {
    const [FormData, setFormData] = useState<FormattedUserData>(UserData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        setFormData(UserData);
    }, [UserData]);
    const isActionInvalid = MoveDirection === 'down' && UserData.PositionLevel <= 0;

    const handleUpdate = async () => {
        setIsSubmitting(true);

        
        const adjustment = MoveDirection === "up" ? 1 : -1;

        const newFormData = {
            ...FormData, // Keep all existing fields
            'PositionLevel': UserData.PositionLevel + adjustment, // Use the pre-calculated new level
        };

        const API_URL = `http://localhost:8080/api/admin/users/roles/${FormData.ID}`;
        const userInfo = localStorage.getItem('user');
        if (!userInfo) {
            const msg = "User information not found in local storage.";
            OnSendData({ "err": msg });
            setIsSubmitting(false);
            return;
        }
        const userObject = JSON.parse(userInfo);
        const bearerToken = userObject?.token;
        
        try {
            const response = await axios.put(
                API_URL, 
                newFormData,
                { headers: { 'Authorization': `Bearer ${bearerToken}` } }
            );

            console.log("Update successful:", response.data);
            OnSendData({}); // Call the callback on success

        } catch (err: any) {
            console.error("Failed to update user role:", err);
            OnSendData({ "err": err });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <button
            onClick={handleUpdate}
            disabled={isSubmitting || isActionInvalid}
            className={`
            flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300 bg-amber-200 px-4 py-1 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-yellow-800 dark:bg-yellow-600 dark:text-gray-200 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto
            ${ isSubmitting || isActionInvalid ? "cursor-not-allowed opacity-50" : "" }
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
                {MoveDirection === "up" ?
                    <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.60141 2.33683C7.73885 2.18084 7.9401 2.08243 8.16435 2.08243C8.16475 2.08243 8.16516 2.08243 8.16556 2.08243C8.35773 2.08219 8.54998 2.15535 8.69664 2.30191L12.6968 6.29924C12.9898 6.59203 12.9899 7.0669 12.6971 7.3599C12.4044 7.6529 11.9295 7.65306 11.6365 7.36027L8.91435 4.64004L8.91435 13.5C8.91435 13.9142 8.57856 14.25 8.16435 14.25C7.75013 14.25 7.41435 13.9142 7.41435 13.5L7.41435 4.64442L4.69679 7.36025C4.4038 7.65305 3.92893 7.6529 3.63613 7.35992C3.34333 7.06693 3.34348 6.59206 3.63646 6.29926L7.60141 2.33683Z"
                    fill="#039855"
                    />
                    :
                    <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.26816 13.6632C7.4056 13.8192 7.60686 13.9176 7.8311 13.9176C7.83148 13.9176 7.83187 13.9176 7.83226 13.9176C8.02445 13.9178 8.21671 13.8447 8.36339 13.6981L12.3635 9.70076C12.6565 9.40797 12.6567 8.9331 12.3639 8.6401C12.0711 8.34711 11.5962 8.34694 11.3032 8.63973L8.5811 11.36L8.5811 2.5C8.5811 2.08579 8.24531 1.75 7.8311 1.75C7.41688 1.75 7.0811 2.08579 7.0811 2.5L7.0811 11.3556L4.36354 8.63975C4.07055 8.34695 3.59568 8.3471 3.30288 8.64009C3.01008 8.93307 3.01023 9.40794 3.30321 9.70075L7.26816 13.6632Z"
                    fill="#D92D20"
                    />
                }
            </svg>
            Change {MoveDirection}
            </button>
        </div>
    );
}
