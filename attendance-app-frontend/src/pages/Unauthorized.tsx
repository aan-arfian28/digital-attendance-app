const Unauthorized = () => {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold">403</h1>
          <p className="text-xl">Unauthorized</p>
          <p>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  };
  
  export default Unauthorized;
  