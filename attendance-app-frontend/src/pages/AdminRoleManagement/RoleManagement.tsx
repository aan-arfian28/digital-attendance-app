import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import AdminRoleTableAdmins from "../../components/SemanticComponent/UserManagement/AdminRoleTable/AdminRoleTable";
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
        Role
      </h3>
      <div className="space-y-6 my-4">
          <AdminRoleTableAdmins />
      </div>
    </>
  );
}
