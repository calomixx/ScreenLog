async function check() {
  const res = await fetch('http://localhost:3000/api/media');
  console.log(await res.json());
}
check();
