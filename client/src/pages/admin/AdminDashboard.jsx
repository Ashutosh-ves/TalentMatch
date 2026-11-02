export function AdminDashboard() {
  return (
    <div className="py-8">
      <div className="flex flex-col gap-6">
        <div>
          <span className="font-label-mono text-xs uppercase tracking-widest text-text-muted">
            Administrator Portal
          </span>
          <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold tracking-tighter text-primary mt-1">
            Pending Registrations
          </h1>
          <p className="font-body-md text-text-muted mt-2">
            Review and approve incoming recruiter accounts to grant them access to the talent gallery.
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-border-hairline p-8">
          <div className="p-8 border border-dashed border-border-hairline text-center font-label-mono text-sm text-text-muted">
            Admin approval workflow and user management table will be implemented in the admin phase.
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
