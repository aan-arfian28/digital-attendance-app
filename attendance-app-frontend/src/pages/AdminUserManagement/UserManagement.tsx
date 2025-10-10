import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import AdminUserTableAdmins from "../../components/SemanticComponent/UserManagement/AdminUserTable/AdminUserTable-admins";
import AdminUserTableNonAdmins from "../../components/SemanticComponent/UserManagement/AdminUserTable/AdminUserTable-non-admins";
export default function UserManagement() {
  return (
    <>
      <PageMeta
        title="React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template"
        description="This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Basic Tables" />
      <h3
        className="text-x font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        Admin User
      </h3>
      <div className="space-y-6 my-4">
          <AdminUserTableAdmins />
      </div>
      <h3
        className="text-x font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        Non-Admin User
      </h3>
      <div className="space-y-6 my-4">
          <AdminUserTableNonAdmins />
      </div>
    </>
  );
}
