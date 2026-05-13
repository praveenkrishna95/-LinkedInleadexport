import { useEffect, useState } from "react";
import LeadsTable from "./components/LeadsTable.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function App() {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState({
    query: "Home Decor Showroom Owner USA",
    maxPages: 3
  });
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function fetchLeads() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/leads`);
      if (!response.ok) throw new Error("Unable to load leads");
      const data = await response.json();
      setLeads(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startScraping(event) {
    event.preventDefault();
    setScraping(true);
    setLeads([]);
    setMessage("Scraping started. Log in manually in the LinkedIn browser window, then scraping will continue.");
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          maxPages: Number(form.maxPages)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Scraping failed");
      }

      setMessage(`Scraping completed. Saved ${data.savedCount} lead records.`);
      await fetchLeads();
    } catch (err) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  }

  function exportCsv() {
    window.location.href = `${API_BASE_URL}/export`;
  }

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <main className="app-shell">
      <section className="toolbar">
        <div>
          <p className="eyebrow">Lead Export Automation</p>
          <h1>LinkedIn leads</h1>
        </div>

        <div className="actions">
          <button className="secondary" onClick={exportCsv} disabled={!leads.length}>
            Export CSV
          </button>
        </div>
      </section>

      <form className="scrape-form" onSubmit={startScraping}>
        <label className="query-field">
          <span>Search query</span>
          <input
            name="query"
            onChange={updateForm}
            placeholder="Home Decor Showroom Owner USA"
            required
            type="text"
            value={form.query}
          />
        </label>

        <label>
          <span>Pages</span>
          <input
            max="10"
            min="1"
            name="maxPages"
            onChange={updateForm}
            type="number"
            value={form.maxPages}
          />
        </label>

        <button disabled={scraping} type="submit">
          {scraping ? "Scraping..." : "Start Scraping"}
        </button>
      </form>

      {(message || error) && (
        <section className={error ? "notice error" : "notice"}>
          {error || message}
        </section>
      )}

      <LeadsTable leads={leads} loading={loading} />
    </main>
  );
}
