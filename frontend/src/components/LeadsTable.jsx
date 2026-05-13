export default function LeadsTable({ leads, loading }) {
  if (loading) {
    return <section className="empty-state">Loading leads...</section>;
  }

  if (!leads.length) {
    return <section className="empty-state">No leads saved yet.</section>;
  }

  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Role</th>
            <th>Location</th>
            <th>Email</th>
            <th>LinkedIn</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead._id || lead.linkedinUrl}>
              <td>{lead.name || "Unknown"}</td>
              <td>{lead.company || "-"}</td>
              <td>{lead.role || "-"}</td>
              <td>{lead.location || "-"}</td>
              <td>{lead.email || "-"}</td>
              <td>
                <a href={lead.linkedinUrl} target="_blank" rel="noreferrer">
                  Profile
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

