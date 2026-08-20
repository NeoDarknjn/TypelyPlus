const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const usernameInput = document.getElementById("usernameInput");

const loginButton = document.getElementById("loginButton");
const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");

const authMessage = document.getElementById("authMessage");

const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const messages = document.getElementById("messages");

const addFriendButton = document.getElementById("addFriendButton");
const friendPopup = document.getElementById("friendPopup");
const friendInput = document.getElementById("friendInput");
const confirmFriend = document.getElementById("confirmFriend");
const closePopup = document.getElementById("closePopup");
const friendsList = document.getElementById("friendsList");

const chatName = document.getElementById("chatName");
const chatAvatar = document.getElementById("chatAvatar");

const myUsername = document.getElementById("myUsername");
const myAvatar = document.getElementById("myAvatar");

const changeUsernameButton =
    document.getElementById("changeUsernameButton");

const usernamePopup =
    document.getElementById("usernamePopup");

const newUsernameInput =
    document.getElementById("newUsernameInput");

const saveUsernameButton =
    document.getElementById("saveUsernameButton");

const closeUsernamePopup =
    document.getElementById("closeUsernamePopup");

const changeAvatarButton =
    document.getElementById("changeAvatarButton");

const avatarInput =
    document.getElementById("avatarInput");

const imageInput =
    document.getElementById("imageInput");

const imageButton =
    document.getElementById("imageButton");

const callButton =
    document.getElementById("callButton");

const callPopup =
    document.getElementById("callPopup");

const callStatus =
    document.getElementById("callStatus");

const hangupButton =
    document.getElementById("hangupButton");

const incomingCallPopup =
    document.getElementById("incomingCallPopup");

const incomingCallText =
    document.getElementById("incomingCallText");

const acceptCallButton =
    document.getElementById("acceptCallButton");

const rejectCallButton =
    document.getElementById("rejectCallButton");

const remoteAudio =
    document.getElementById("remoteAudio");


let currentUser = null;
let currentConversation = null;
let currentFriend = null;

let realtimeChannel = null;
let callChannel = null;

let peerConnection = null;
let localStream = null;

let incomingOffer = null;
let incomingCallerId = null;


const rtcConfiguration = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


/* =========================================
   AUTH
========================================= */

async function checkUser() {

    const {
        data,
        error
    } = await supabase.auth.getSession();

    if (error) {

        console.error(error);

        return;
    }

    if (data.session) {

        currentUser =
            data.session.user;

        showApp();

        await createProfileIfNeeded();
        await loadMyProfile();
        await loadFriends();

        startRealtime();
        startCallChannel();

    } else {

        showAuth();
    }
}


function showApp() {

    authScreen.classList.add(
        "hidden"
    );

    app.classList.remove(
        "hidden"
    );
}


function showAuth() {

    authScreen.classList.remove(
        "hidden"
    );

    app.classList.add(
        "hidden"
    );
}


/* =========================================
   SIGN UP
========================================= */

signupButton.addEventListener(
    "click",
    async function () {

        authMessage.textContent =
            "Creating account...";

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        const username =
            usernameInput.value.trim();

        if (
            !email ||
            !password ||
            !username
        ) {

            authMessage.textContent =
                "Enter email, password and username.";

            return;
        }

        const {
            data,
            error
        } = await supabase.auth.signUp({

            email:
                email,

            password:
                password
        });

        if (error) {

            authMessage.textContent =
                error.message;

            return;
        }

        if (!data.user) {

            authMessage.textContent =
                "Check your email to confirm your account.";

            return;
        }

        const {
            error: profileError
        } = await supabase
            .from("profiles")
            .upsert({

                id:
                    data.user.id,

                username:
                    username
            });

        if (profileError) {

            authMessage.textContent =
                profileError.message;

            return;
        }

        authMessage.textContent =
            "Account created! Check your email.";
    }
);


/* =========================================
   LOGIN
========================================= */

loginButton.addEventListener(
    "click",
    async function () {

        authMessage.textContent =
            "Logging in...";

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        if (
            !email ||
            !password
        ) {

            authMessage.textContent =
                "Enter your email and password.";

            return;
        }

        const {
            data,
            error
        } = await supabase.auth
            .signInWithPassword({

                email:
                    email,

                password:
                    password
            });

        if (error) {

            authMessage.textContent =
                error.message;

            return;
        }

        currentUser =
            data.user;

        authMessage.textContent =
            "";

        showApp();

        await createProfileIfNeeded();
        await loadMyProfile();
        await loadFriends();

        startRealtime();
        startCallChannel();
    }
);


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async function () {

        await endCall(false);

        if (realtimeChannel) {

            await supabase
                .removeChannel(
                    realtimeChannel
                );

            realtimeChannel = null;
        }

        if (callChannel) {

            await supabase
                .removeChannel(
                    callChannel
                );

            callChannel = null;
        }

        await supabase.auth.signOut();

        currentUser = null;
        currentConversation = null;
        currentFriend = null;

        showAuth();
    }
);


/* =========================================
   PROFILE
========================================= */

async function createProfileIfNeeded() {

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(
            "id, username, avatar_url"
        )
        .eq(
            "id",
            currentUser.id
        )
        .maybeSingle();

    if (error) {

        console.error(error);

        return;
    }

    if (!data) {

        const username =
            currentUser.email.split("@")[0];

        await supabase
            .from("profiles")
            .insert({

                id:
                    currentUser.id,

                username:
                    username,

                avatar_url:
                    null
            });
    }
}


async function loadMyProfile() {

    const {
        data,
        error
    } = await supabase
        .from("profiles")
        .select(
            "username, avatar_url"
        )
        .eq(
            "id",
            currentUser.id
        )
        .single();

    if (error) {

        console.error(error);

        return;
    }

    myUsername.textContent =
        "@" + data.username;

    setAvatar(
        myAvatar,
        data.avatar_url,
        data.username
    );
}


/* =========================================
   AVATAR
========================================= */

function setAvatar(
    imageElement,
    avatarUrl,
    username
) {

    if (avatarUrl) {

        imageElement.src =
            avatarUrl;

        imageElement.alt =
            username || "Profile picture";

        imageElement.classList.remove(
            "avatarPlaceholder"
        );

    } else {

        imageElement.src =
            createAvatarPlaceholder(
                username
            );

        imageElement.alt =
            username || "Profile picture";

        imageElement.classList.add(
            "avatarPlaceholder"
        );
    }
}


function createAvatarPlaceholder(
    username
) {

    const letter =
        username
            ? username
                .charAt(0)
                .toUpperCase()
            : "?";

    const svg =
        `
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100"
            height="100"
            viewBox="0 0 100 100"
        >
            <rect
                width="100"
                height="100"
                rx="50"
                fill="#8b5cf6"
            />

            <text
                x="50"
                y="58"
                text-anchor="middle"
                font-size="42"
                font-family="Arial"
                fill="white"
            >
                ${letter}
            </text>
        </svg>
        `;

    return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
    );
}


changeAvatarButton.addEventListener(
    "click",
    function () {

        avatarInput.click();
    }
);


avatarInput.addEventListener(
    "change",
    async function () {

        const file =
            avatarInput.files[0];

        if (!file) {
            return;
        }

        if (!currentUser) {
            return;
        }

        if (!file.type.startsWith("image/")) {

            alert(
                "Please choose an image."
            );

            avatarInput.value = "";

            return;
        }

        if (file.size > 5 * 1024 * 1024) {

            alert(
                "Profile picture must be smaller than 5 MB."
            );

            avatarInput.value = "";

            return;
        }

        changeAvatarButton.disabled =
            true;

        changeAvatarButton.textContent =
            "Uploading...";

        try {

            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();

            const filePath =
                currentUser.id +
                "/avatar-" +
                Date.now() +
                "." +
                extension;


            const {
                error: uploadError
            } = await supabase.storage
                .from("avatars")
                .upload(
                    filePath,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            true
                    }
                );

            if (uploadError) {

                throw uploadError;
            }


            const {
                data
            } = supabase.storage
                .from("avatars")
                .getPublicUrl(
                    filePath
                );


            const avatarUrl =
                data.publicUrl;


            const {
                error: updateError
            } = await supabase
                .from("profiles")
                .update({

                    avatar_url:
                        avatarUrl

                })
                .eq(
                    "id",
                    currentUser.id
                );

            if (updateError) {

                throw updateError;
            }


            setAvatar(
                myAvatar,
                avatarUrl,
                myUsername.textContent
                    .replace("@", "")
            );

            alert(
                "Profile picture updated!"
            );

        } catch (error) {

            console.error(
                "AVATAR ERROR:",
                error
            );

            alert(
                "Could not upload profile picture: " +
                error.message
            );

        } finally {

            changeAvatarButton.disabled =
                false;

            changeAvatarButton.textContent =
                "Change Profile Picture";

            avatarInput.value = "";
        }
    }
);


/* =========================================
   USERNAME
========================================= */

changeUsernameButton.addEventListener(
    "click",
    function () {

        usernamePopup.classList.remove(
            "hidden"
        );

        newUsernameInput.value =
            myUsername.textContent
                .replace("@", "");

        newUsernameInput.focus();
    }
);


closeUsernamePopup.addEventListener(
    "click",
    function () {

        usernamePopup.classList.add(
            "hidden"
        );
    }
);


saveUsernameButton.addEventListener(
    "click",
    async function () {

        const newUsername =
            newUsernameInput.value.trim();

        if (!newUsername) {

            alert(
                "Enter a username."
            );

            return;
        }

        if (newUsername.length < 3) {

            alert(
                "Username must be at least 3 characters."
            );

            return;
        }

        const {
            data: existingUser,
            error: searchError
        } = await supabase
            .from("profiles")
            .select("id")
            .eq(
                "username",
                newUsername
            )
            .maybeSingle();

        if (searchError) {

            alert(
                searchError.message
            );

            return;
        }

        if (
            existingUser &&
            existingUser.id !==
                currentUser.id
        ) {

            alert(
                "That username is already taken."
            );

            return;
        }

        const {
            error: updateError
        } = await supabase
            .from("profiles")
            .update({

                username:
                    newUsername

            })
            .eq(
                "id",
                currentUser.id
            );

        if (updateError) {

            alert(
                updateError.message
            );

            return;
        }

        myUsername.textContent =
            "@" + newUsername;

        usernamePopup.classList.add(
            "hidden"
        );

        await loadFriends();
    }
);


/* =========================================
   FRIENDS
========================================= */

async function loadFriends() {

    friendsList.innerHTML = "";

    const {
        data,
        error
    } = await supabase
        .from("friends")
        .select(
            "friend_id"
        )
        .eq(
            "user_id",
            currentUser.id
        );

    if (error) {

        console.error(error);

        return;
    }

    for (
        const friend of data
    ) {

        const {
            data: profile
        } = await supabase
            .from("profiles")
            .select(
                "id, username, avatar_url"
            )
            .eq(
                "id",
                friend.friend_id
            )
            .single();

        if (!profile) {
            continue;
        }

        const element =
            document.createElement(
                "div"
            );

        element.className =
            "friend";


        const avatar =
            document.createElement(
                "img"
            );

        avatar.className =
            "friendAvatar";

        setAvatar(
            avatar,
            profile.avatar_url,
            profile.username
        );


        const name =
            document.createElement(
                "span"
            );

        name.textContent =
            "@" + profile.username;


        element.appendChild(
            avatar
        );

        element.appendChild(
            name
        );


        element.addEventListener(
            "click",
            function () {

                openChat(
                    profile
                );
            }
        );


        friendsList.appendChild(
            element
        );
    }
}


/* =========================================
   ADD FRIEND
========================================= */

addFriendButton.addEventListener(
    "click",
    function () {

        friendPopup.classList.remove(
            "hidden"
        );

        friendInput.value = "";

        friendInput.focus();
    }
);


closePopup.addEventListener(
    "click",
    function () {

        friendPopup.classList.add(
            "hidden"
        );
    }
);


confirmFriend.addEventListener(
    "click",
    async function () {

        const username =
            friendInput.value.trim();

        if (!username) {
            return;
        }

        const {
            data: profile,
            error
        } = await supabase
            .from("profiles")
            .select(
                "id, username, avatar_url"
            )
            .eq(
                "username",
                username
            )
            .maybeSingle();

        if (error) {

            alert(
                error.message
            );

            return;
        }

        if (!profile) {

            alert(
                "User not found."
            );

            return;
        }

        if (
            profile.id ===
            currentUser.id
        ) {

            alert(
                "You cannot add yourself."
            );

            return;
        }

        const {
            error: friendError
        } = await supabase
            .from("friends")
            .insert({

                user_id:
                    currentUser.id,

                friend_id:
                    profile.id
            });

        if (friendError) {

            alert(
                friendError.message
            );

            return;
        }

        friendInput.value = "";

        friendPopup.classList.add(
            "hidden"
        );

        await loadFriends();
    }
);


/* =========================================
   PRIVATE CHAT
========================================= */

async function openChat(friend) {

    currentFriend =
        friend;

    chatName.textContent =
        "@" + friend.username;

    setAvatar(
        chatAvatar,
        friend.avatar_url,
        friend.username
    );

    messages.innerHTML = "";

    currentConversation =
        null;


    const {
        data: existing,
        error
    } = await supabase
        .from("conversations")
        .select("*")
        .or(

            "and(user1_id.eq." +
            currentUser.id +
            ",user2_id.eq." +
            friend.id +
            "),and(user1_id.eq." +
            friend.id +
            ",user2_id.eq." +
            currentUser.id +
            ")"

        )
        .maybeSingle();


    if (error) {

        console.error(error);

        return;
    }


    if (existing) {

        currentConversation =
            existing;

    } else {

        const {
            data: newConversation,
            error: createError
        } = await supabase
            .from("conversations")
            .insert({

                user1_id:
                    currentUser.id,

                user2_id:
                    friend.id

            })
            .select()
            .single();


        if (createError) {

            console.error(
                createError
            );

            return;
        }

        currentConversation =
            newConversation;
    }


    await loadMessages();
}


/* =========================================
   MESSAGES
========================================= */

async function loadMessages() {

    if (!currentConversation) {
        return;
    }

    messages.innerHTML = "";


    const {
        data,
        error
    } = await supabase
        .from("messages")
        .select("*")
        .eq(
            "conversation_id",
            currentConversation.id
        )
        .order(
            "created_at",
            {
                ascending:
                    true
            }
        );


    if (error) {

        console.error(error);

        return;
    }


    data.forEach(
        function (message) {

            addMessageToScreen(
                message
            );
        }
    );
}


function addMessageToScreen(
    message
) {

    const element =
        document.createElement(
            "div"
        );


    if (
        message.sender_id ===
        currentUser.id
    ) {

        element.className =
            "message me";

    } else {

        element.className =
            "message other";
    }


    if (
        message.message &&
        message.message.indexOf(
            "IMAGE:"
        ) === 0
    ) {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            message.message.substring(
                6
            );

        image.style.maxWidth =
            "300px";

        image.style.borderRadius =
            "10px";

        element.appendChild(
            image
        );

    } else {

        element.textContent =
            message.message;
    }


    messages.appendChild(
        element
    );

    messages.scrollTop =
        messages.scrollHeight;
}


async function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }


    if (!currentConversation) {

        alert(
            "Choose a friend first."
        );

        return;
    }


    const {
        data,
        error
    } = await supabase
        .from("messages")
        .insert({

            sender_id:
                currentUser.id,

            conversation_id:
                currentConversation.id,

            message:
                text

        })
        .select()
        .single();


    if (error) {

        alert(
            error.message
        );

        return;
    }


    addMessageToScreen(
        data
    );

    messageInput.value =
        "";

    messageInput.focus();
}


sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Enter"
        ) {

            sendMessage();
        }
    }
);


/* =========================================
   IMAGE MESSAGES
========================================= */

imageButton.addEventListener(
    "click",
    function () {

        if (!currentConversation) {

            alert(
                "Choose a friend first."
            );

            return;
        }

        imageInput.click();
    }
);


imageInput.addEventListener(
    "change",
    async function () {

        const file =
            imageInput.files[0];

        if (!file) {
            return;
        }

        if (!currentConversation) {
            return;
        }


        const fileName =
            currentUser.id +
            "/" +
            Date.now() +
            "-" +
            file.name;


        const {
            error: uploadError
        } = await supabase.storage
            .from("chat-images")
            .upload(
                fileName,
                file
            );


        if (uploadError) {

            alert(
                uploadError.message
            );

            return;
        }


        const {
            data
        } = supabase.storage
            .from("chat-images")
            .getPublicUrl(
                fileName
            );


        const {
            data: message,
            error
        } = await supabase
            .from("messages")
            .insert({

                sender_id:
                    currentUser.id,

                conversation_id:
                    currentConversation.id,

                message:
                    "IMAGE:" +
                    data.publicUrl

            })
            .select()
            .single();


        if (error) {

            alert(
                error.message
            );

            return;
        }


        addMessageToScreen(
            message
        );

        imageInput.value =
            "";
    }
);


/* =========================================
   PRIVATE REALTIME
========================================= */

function startRealtime() {

    if (realtimeChannel) {
        return;
    }


    realtimeChannel =
        supabase
            .channel(
                "messages-realtime"
            )
            .on(
                "postgres_changes",
                {

                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "messages"

                },
                function (payload) {

                    const message =
                        payload.new;


                    if (
                        currentConversation &&
                        message.conversation_id ===
                            currentConversation.id &&
                        message.sender_id !==
                            currentUser.id
                    ) {

                        addMessageToScreen(
                            message
                        );
                    }
                }
            )
            .subscribe();
}


/* =========================================
   CALLS
========================================= */

function startCallChannel() {

    if (
        !currentUser ||
        callChannel
    ) {

        return;
    }


    callChannel =
        supabase
            .channel(
                "typely-calls"
            )
            .on(
                "broadcast",
                {
                    event:
                        "call-signal"
                },
                async function (payload) {

                    const signal =
                        payload.payload;


                    if (!signal) {
                        return;
                    }


                    if (
                        signal.to !==
                        currentUser.id
                    ) {

                        return;
                    }


                    await handleCallSignal(
                        signal
                    );
                }
            )
            .subscribe();
}


async function sendCallSignal(
    signal
) {

    if (!callChannel) {

        startCallChannel();

        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    500
                );
            }
        );
    }


    if (!callChannel) {
        return;
    }


    await callChannel.send({

        type:
            "broadcast",

        event:
            "call-signal",

        payload:
            signal

    });
}


/* =========================================
   CALL BUTTON
========================================= */

callButton.addEventListener(
    "click",
    async function () {

        if (!currentFriend) {

            alert(
                "Choose a friend first."
            );

            return;
        }


        if (peerConnection) {
            return;
        }


        await startOutgoingCall();
    }
);


async function startOutgoingCall() {

    try {

        callPopup.classList.remove(
            "hidden"
        );


        callStatus.textContent =
            "Calling @" +
            currentFriend.username +
            "...";


        await createPeerConnection();


        localStream =
            await navigator.mediaDevices
                .getUserMedia({

                    audio:
                        true,

                    video:
                        false

                });


        localStream
            .getTracks()
            .forEach(
                function (track) {

                    peerConnection
                        .addTrack(
                            track,
                            localStream
                        );
                }
            );


        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        await sendCallSignal({

            type:
                "offer",

            from:
                currentUser.id,

            to:
                currentFriend.id,

            offer:
                offer

        });

    } catch (error) {

        console.error(error);

        alert(
            "Could not start the call: " +
            error.message
        );

        await endCall(false);
    }
}


async function createPeerConnection() {

    peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    peerConnection.onicecandidate =
        async function (event) {

            if (
                !event.candidate ||
                !currentFriend
            ) {

                return;
            }


            await sendCallSignal({

                type:
                    "ice-candidate",

                from:
                    currentUser.id,

                to:
                    currentFriend.id,

                candidate:
                    event.candidate

            });
        };


    peerConnection.ontrack =
        function (event) {

            remoteAudio.srcObject =
                event.streams[0];


            remoteAudio
                .play()
                .catch(
                    function () {}
                );
        };


    peerConnection.onconnectionstatechange =
        function () {

            if (!peerConnection) {
                return;
            }


            const state =
                peerConnection
                    .connectionState;


            if (
                state ===
                "connected"
            ) {

                callStatus.textContent =
                    "Connected 📞";
            }


            if (
                state ===
                    "failed" ||
                state ===
                    "disconnected"
            ) {

                endCall(false);
            }
        };
}


/* =========================================
   CALL SIGNAL
========================================= */

async function handleCallSignal(
    signal
) {

    if (
        signal.type ===
        "offer"
    ) {

        await handleIncomingOffer(
            signal
        );

        return;
    }


    if (
        signal.type ===
        "answer"
    ) {

        if (!peerConnection) {
            return;
        }


        await peerConnection
            .setRemoteDescription(
                new RTCSessionDescription(
                    signal.answer
                )
            );


        callStatus.textContent =
            "Connecting...";

        return;
    }


    if (
        signal.type ===
        "ice-candidate"
    ) {

        if (
            !peerConnection ||
            !signal.candidate
        ) {

            return;
        }


        try {

            await peerConnection
                .addIceCandidate(
                    new RTCIceCandidate(
                        signal.candidate
                    )
                );

        } catch (error) {

            console.error(error);
        }

        return;
    }


    if (
        signal.type ===
        "reject"
    ) {

        callStatus.textContent =
            "Call declined.";


        setTimeout(
            function () {

                endCall(false);

            },
            1000
        );

        return;
    }


    if (
        signal.type ===
        "hangup"
    ) {

        await endCall(false);
    }
}


/* =========================================
   INCOMING CALL
========================================= */

async function handleIncomingOffer(
    signal
) {

    if (peerConnection) {

        await sendCallSignal({

            type:
                "reject",

            from:
                currentUser.id,

            to:
                signal.from

        });

        return;
    }


    incomingOffer =
        signal.offer;

    incomingCallerId =
        signal.from;


    const {
        data: callerProfile
    } = await supabase
        .from("profiles")
        .select(
            "username"
        )
        .eq(
            "id",
            signal.from
        )
        .maybeSingle();


    if (callerProfile) {

        incomingCallText.textContent =
            "@" +
            callerProfile.username +
            " is calling you...";

    } else {

        incomingCallText.textContent =
            "Someone is calling you...";
    }


    incomingCallPopup.classList.remove(
        "hidden"
    );
}


/* =========================================
   ACCEPT CALL
========================================= */

acceptCallButton.addEventListener(
    "click",
    async function () {

        incomingCallPopup.classList.add(
            "hidden"
        );


        try {

            const {
                data: callerProfile
            } = await supabase
                .from("profiles")
                .select(
                    "id, username, avatar_url"
                )
                .eq(
                    "id",
                    incomingCallerId
                )
                .single();


            currentFriend =
                callerProfile;


            chatName.textContent =
                "@" +
                callerProfile.username;


            setAvatar(
                chatAvatar,
                callerProfile.avatar_url,
                callerProfile.username
            );


            callPopup.classList.remove(
                "hidden"
            );


            callStatus.textContent =
                "Connecting...";


            await createPeerConnection();


            localStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        audio:
                            true,

                        video:
                            false
                    });


            localStream
                .getTracks()
                .forEach(
                    function (track) {

                        peerConnection
                            .addTrack(
                                track,
                                localStream
                            );
                    }
                );


            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        incomingOffer
                    )
                );


            const answer =
                await peerConnection
                    .createAnswer();


            await peerConnection
                .setLocalDescription(
                    answer
                );


            await sendCallSignal({

                type:
                    "answer",

                from:
                    currentUser.id,

                to:
                    incomingCallerId,

                answer:
                    answer

            });


            incomingOffer =
                null;

            incomingCallerId =
                null;

        } catch (error) {

            console.error(error);

            alert(
                "Could not answer the call: " +
                error.message
            );

            await endCall(false);
        }
    }
);


/* =========================================
   REJECT CALL
========================================= */

rejectCallButton.addEventListener(
    "click",
    async function () {

        incomingCallPopup.classList.add(
            "hidden"
        );


        if (incomingCallerId) {

            await sendCallSignal({

                type:
                    "reject",

                from:
                    currentUser.id,

                to:
                    incomingCallerId

            });
        }


        incomingOffer =
            null;

        incomingCallerId =
            null;
    }
);


/* =========================================
   HANG UP
========================================= */

hangupButton.addEventListener(
    "click",
    async function () {

        await endCall(true);
    }
);


async function endCall(
    notify
) {

    if (
        notify &&
        currentFriend
    ) {

        await sendCallSignal({

            type:
                "hangup",

            from:
                currentUser.id,

            to:
                currentFriend.id

        });
    }


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    track.stop();
                }
            );

        localStream =
            null;
    }


    if (peerConnection) {

        peerConnection.close();

        peerConnection =
            null;
    }


    remoteAudio.srcObject =
        null;


    callPopup.classList.add(
        "hidden"
    );


    incomingCallPopup.classList.add(
        "hidden"
    );


    incomingOffer =
        null;

    incomingCallerId =
        null;
}


/* =========================================
   START
========================================= */

checkUser();