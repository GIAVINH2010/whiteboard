$(document).ready(function () {
  let isOpen = false;
  let name = prompt("Please enter your name");
  const socket = io({
    // auth: {
    //   token: name,
    // },
    transportOptions: {
      polling: {
        extraHeaders: {
          Authorization: `Bearer yourToken`,
        },
      },
    },
  });

  socket.on("connect_error", (err) => {
    console.log(err instanceof Error);
    console.log(err.message);
    console.log(err.data);

    socket.disconnect();
    $(".status").text("offline");

    alert(err.message);
  });

  socket.on("connect", () => {
    console.log("CONNECTED");

    $(".status").text("online");

    const profile = {
      name,
      role: name === "admin" ? "admin" : "user",
    };
    socket.emit("connected", profile);
  });

  socket.on("user-list", (userList) => {
    console.log(
      "🚀 ~ file: main.js ~ line 34 ~ socket.on ~ userList",
      userList
    );
    const $userList = $("#userList");
    $userList.empty();
    for (const user of userList) {
      $userList.append(`<li class="list-group-item">${user.name}</li>`);
    }
  });

  // others events
  socket.on("user-connected", (newUser) => {
    alert(`${newUser} has joined with us`);
  });
  socket.on("user-disconnected", (user) => {
    alert(`${user} has disconnected`);
  });

  // function connectToSocket() {
  //   const name = prompt("Please enter your name");
  //   socket = io({
  //     auth: {
  //       token: name,
  //     },
  //   });
  //   setupSocket();
  // }

  $("#open").click(function () {
    const type = $(this).data("type");
    if (type === "open") {
      $(".whiteboard").show();
      $(this).data("type", "close").text("Close whiteboard");
      isOpen = true;
    } else {
      $(".whiteboard").hide();
      $(this).data("type", "open").text("Open whiteboard");

      isOpen = false;
    }
  });

  $("#reconnect").click(function () {
    name = prompt("Please enter your name");
    console.log("🚀 ~ file: main.js ~ line 74 ~ name", name);
    socket.disconnect().connect();
  });
  $("#disconnect").click(function () {
    socket.disconnect();
    $(".status").text("offline");
    $userList.empty();
    alert("You are disconnected");
    console.log("DISCONECTED");
  });
});
