async function check() {
  const res = await fetch('http://localhost:3000/api/db-status');
  console.log(await res.json());
}
check();
