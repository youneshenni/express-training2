fetch("/users")
    .then(res => res.json())
    .then(data => {
        const tableHTML = data.map(({ nom, password, email }) => `<tr><td>${nom}</td><td>${email}</td><td>${password}</td></tr>`).join("");
        document.querySelector("table > tbody").innerHTML = tableHTML;
    })

document.querySelector("form:nth-child(2)").addEventListener("submit", e => {
    e.preventDefault();
    const username = document.querySelector("#nom").value;
    const password = document.querySelector("#password").value;
    const email = document.querySelector("#email").value;
    fetch("/user", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email })
    })
        .then(res => {
            if (res.status === 200) {
                fetch("/users")
                    .then(res => res.json())
                    .then(data => {
                        const tableHTML = data.map(({ nom, password, email }) => `<tr><td>${nom}</td><td>${email}</td><td>${password}</td></tr>`).join("");
                        document.querySelector("table > tbody").innerHTML = tableHTML;
                    })
            }
        })
});

