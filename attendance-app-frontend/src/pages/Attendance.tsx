import PageBreadCrumb from "../components/common/PageBreadCrumb";

const Attendance = () => {
  return (
    <div className="w-full">
      <PageBreadCrumb pageTitle="Attendance" />
      <div className="p-4 border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
        <p>Your attendance records will be displayed here.</p>
      </div>
    </div>
  );
};

export default Attendance;
