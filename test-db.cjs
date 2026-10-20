async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user',
        mediaId: 'test-media',
        status: 'pendiente',
        rating: 5,
      })
    });
    const text = await res.text();
    console.log(text);
  } catch(e) { console.error(e) }
}
test();
