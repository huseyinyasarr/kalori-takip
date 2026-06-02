import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartPoint {
  date: string;
  label: string;
  calories?: number;
  calorieTarget?: number;
  calorieAverage?: number;
  protein?: number;
  proteinTarget?: number;
  proteinAverage?: number;
  weight?: number | null;
  waterLiter?: number;
  waterTargetLiter?: number;
  waterAverageLiter?: number;
}

export function CaloriesChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e1" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="calories" name="Alınan kalori" fill="#2f7d5b" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="calorieTarget"
          name="Kalori hedefi"
          stroke="#17201c"
          strokeDasharray="6 4"
          strokeWidth={3}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="calorieAverage"
          name="Ortalama kalori"
          stroke="#ef7d63"
          strokeDasharray="3 5"
          strokeWidth={3}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ProteinChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e1" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="protein" name="Alınan protein" stroke="#ef7d63" strokeWidth={3} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="proteinTarget"
          name="Protein hedefi"
          stroke="#17201c"
          strokeDasharray="6 4"
          strokeWidth={3}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="proteinAverage"
          name="Ortalama protein"
          stroke="#2f7d5b"
          strokeDasharray="3 5"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeightChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e1" />
        <XAxis dataKey="label" />
        <YAxis domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip />
        <Line type="monotone" dataKey="weight" name="Kilo" stroke="#17201c" strokeWidth={3} dot={{ r: 3 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WaterChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e1" />
        <XAxis dataKey="label" />
        <YAxis unit=" L" />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="waterLiter" name="İçilen su" stroke="#2f7d5b" strokeWidth={3} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="waterTargetLiter"
          name="Su hedefi"
          stroke="#17201c"
          strokeDasharray="6 4"
          strokeWidth={3}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="waterAverageLiter"
          name="Ortalama su"
          stroke="#ef7d63"
          strokeDasharray="3 5"
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
