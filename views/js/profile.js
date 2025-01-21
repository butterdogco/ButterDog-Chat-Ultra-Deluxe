/* 
    Profile Handler
    This script manages the profile page and runs the main chat script upon logging in.
*/

let username = null;
let avatarFile = null;

const elements = {
    Profile: {
        Dialog: document.getElementById("profileDialog"),
        HeaderLabel: document.getElementById("profileHeaderLabel"),
        SaveButton: document.getElementById("profileSaveButton"),
        AvatarInput: document.getElementById("profileAvatarInput"),
        AvatarImg: document.getElementById("profileAvatarImg"),
        UsernameLabel: document.getElementById("profileUsernameLabel"),
        UsernameInput: document.getElementById("profileUsernameInput"),
        EditButton: document.getElementById("profileDialogButton"),
        CloseButton: document.getElementById("profileCloseButton"),
    },
};

let accountSetup = false;
let profileDialogOpen = false;
let uploadDialogOpen = false;
let enlargedImageOpen = false;

// Initialize saved username and avatar
const savedUsername = localStorage.getItem("username");
if (savedUsername) {
    elements.Profile.UsernameInput.value = savedUsername;
}

const savedAvatar = localStorage.getItem("avatar");
if (savedAvatar) {
    // elements.Profile.AvatarImg.src = savedAvatar;
}

const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);

        fileReader.onload = () => resolve(fileReader.result);
        fileReader.onerror = (error) => reject(error);
    });
};

const truncateText = (text, maxLength) => {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const setOverlay = (visible) => {
    const overlay = document.getElementById("chatOverlay");
    overlay.style.display = visible ? "block" : "none";
};

const toggleProfileDialog = () => {
    const dialog = elements.Profile.Dialog;
    dialog.classList.toggle("hidden");
    setOverlay(!dialog.classList.contains("hidden"));
};

const previewProfileImage = async (event) => {
    const file = event.target.files[0];
    if (file) {
        if (file.size < 800000) {
            elements.Profile.AvatarImg.src = await convertBase64(file);
            avatarFile = file;
        } else {
            alert("The image is too large! It must be less than 1MB.");
            elements.Profile.AvatarInput.value = "";
        }
    }
};

const login = async (username, avatar, silent) => {
    main();
    return new Promise((resolve, reject) => {
        socket.emit(
            "login",
            { Username: username, Avatar: avatar, Silent: silent },
            (response) => {
                response?.Success ? resolve(response) : reject(response || { Success: false, Error: "Unknown error" });
            }
        );
    });
};

const saveProfile = async () => {
    const newUsername = elements.Profile.UsernameInput.value;
    const newAvatar = avatarFile;

    try {
        const response = await login(newUsername, newAvatar, accountSetup);
        if (response.Success == true) {
            username = response.Username;
            localStorage.setItem("username", username);
            localStorage.setItem("avatar", avatarFile);

            elements.Profile.CloseButton.style.display = "block";
            elements.Profile.UsernameLabel.textContent = "Username";
            elements.Profile.UsernameInput.value = username;
            console.log(response);

            if (!accountSetup) {
                toggleProfileDialog();
                // main();
            }
        } else {
            elements.Profile.UsernameLabel.textContent = response.Error;
        }
    } catch (error) {
        console.warn(error);
        alert(error);
        elements.Profile.UsernameLabel.textContent = error.Error || "Login failed";
    }
};

// Event listeners
elements.Profile.SaveButton.addEventListener("click", saveProfile);
elements.Profile.CloseButton.addEventListener("click", toggleProfileDialog);
elements.Profile.EditButton.addEventListener("click", toggleProfileDialog);
elements.Profile.AvatarInput.addEventListener("change", previewProfileImage);

// Show the profile dialog by default
toggleProfileDialog();