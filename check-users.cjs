async function check() {
  const res = await fetch('http://localhost:3000/api/users');
  console.log(await res.json());
}
check();
