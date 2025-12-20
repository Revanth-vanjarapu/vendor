export default function AssignDriverPanel({
  drivers,
  selectedDriver,
  onSelectDriver,
  onAutoAssign,
  onAssign,
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between mb-3">
          <h6 className="fw-semibold mb-0">Assign Driver</h6>
          <span className="badge bg-success-subtle text-success">
            Ready
          </span>
        </div>

        {/* Auto Assign */}
        <button
          className="btn btn-outline-primary w-100 mb-3"
          onClick={onAutoAssign}
        >
          Auto Assign Nearest Driver
        </button>

        <div className="text-muted small mb-2">
          Available Drivers
        </div>

        <div className="list-group mb-3">
          {drivers.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`list-group-item list-group-item-action ${
                selectedDriver?.id === d.id ? "active" : ""
              }`}
              onClick={() => onSelectDriver(d)}
            >
              {d.name} — {d.distance} km away
            </button>
          ))}
        </div>

        <button
          className="btn btn-dark w-100"
          disabled={!selectedDriver}
          onClick={onAssign}
        >
          Assign Selected Driver
        </button>
      </div>
    </div>
  );
}
