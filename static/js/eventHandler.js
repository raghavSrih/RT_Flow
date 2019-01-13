var availableScreens = ["#socialscreen-body", "#browserscreen-body", "#cookingscreen-wrapper"];
var activeScreenID = "#socialscreen-body";
var scrollOffset = 50;

/**
* Receive data from Meschup
* @param {*} sData object with any type of data
*/
function receiveData(sData) {
    console.log(sData);
    if (sData.indexOf("meschupState") >= 0) {

        document.getElementById("controller-body").contentWindow.receiveData(sData);

        var dataStr = sData.substring(17, sData.length - 2);

        console.log("Received command: meschupState - " + dataStr);

        console.log(sData);
    } else {
        // var activeScreen = $('#socialscreeen');
        var data = JSON.parse(sData);
        console.log(data);


        // #### SGC EVENTS ####//
        if (data.hasOwnProperty("sgc")) {
            if (data.sgc.hasOwnProperty("command")) {
                console.log("Received command: " + data.sgc.command);
                if (data.sgc.command == "next-step") {

                    cookingController.go2NextStep();

                } else if (data.sgc.command == "previous-step") {

                    cookingController.go2PreviousStep();

                } else if (data.sgc.command == "stop-video") {

                    cookingController.stopVideo(cookingController.getCurrentStepGroupNumber());

                } else if (data.sgc.command == "play-video") {

                    cookingController.playVideo(cookingController.getCurrentStepGroupNumber());

                } else if (data.sgc.command == "pause-video") {

                    cookingController.pauseVideo(cookingController.getCurrentStepGroupNumber());

                } else if (data.sgc.command == "start-timer") {

                    CookingTimer.startTimer();

                } else if (data.sgc.command == "stop-timer") {

                    CookingTimer.pauseTimer();
                    // CookingTimer.stopTimer();
                }

                else if (data.sgc.command == "start-cooking") {

                    cookingController.init();

                } else if (data.sgc.command == "stop-cooking") {

                    cookingController.end();
                }

            } else if (data.sgc.hasOwnProperty("recipt")) {
                console.log("Received Recipt: " + data.sgc.recipt);
                cookingController.recipt = data.sgc.recipt;
            } else if (data.sgc.hasOwnProperty("weight")) {
                console.log("Received Weight: " + data.sgc.weight);
                WeightScale.setCurrentWeight(data.sgc.weight);
            }

        }
        // #### VOLUME EVENTS #### //
        else if (data.hasOwnProperty("setVolume")) {
            console.log("Received command: " + data.setVolume);
            soundController.setVolume(data.setVolume);
        }
        // #### FACEBOOK EVENTS #### //
        else if (data.hasOwnProperty("facebook")) {
            // $(activeScreenID).fadeOut();
            lastActiveScreenID = activeScreenID;
            activeScreenID = "#socialscreen-body";
            if (data.facebook.hasOwnProperty("state")) {
                console.log("Received command: " + data.facebook.state);
                if (data.facebook.state == "on") {
                    activeScreenID = "#socialscreen-body";
                    lastActiveScreenID = "#socialscreen-body";
                    $(activeScreenID).fadeIn();
                } else if (data.facebook.state == "off") {
                    $(activeScreenID).fadeOut();
                }
            }
            activeScreenID = lastActiveScreenID;
        }
        // #### BROWSER EVENTS #### //
        else if (data.hasOwnProperty("browser")) {
            // $(activeScreenID).fadeOut();
            lastActiveScreenID = activeScreenID;
            activeScreenID = "#browserscreen-body";
            if (data.browser.hasOwnProperty("state")) {
                console.log("Received command: " + data.browser.state);
                if (data.browser.state == "on") {
                    activeScreenID = "#browserscreen-body";
                    lastActiveScreenID = "#browserscreen-body";
                    $(activeScreenID).fadeIn();
                } else if (data.browser.state == "off") {
                    $(activeScreenID).fadeOut();
                }
            }
            activeScreenID = lastActiveScreenID;
        }
        // #### INSTAGRAM EVENTS #### //
        else if (data.hasOwnProperty("instagram")) {
            // $(activeScreenID).fadeOut();
            lastActiveScreenID = activeScreenID;
            activeScreenID = "#instagramscreen-body";
            if (data.instagram.hasOwnProperty("state")) {
                console.log("Received command: " + data.instagram.state);
                if (data.instagram.state == "on") {
                    activeScreenID = "#instagramscreen-body";
                    lastActiveScreenID = "#instagramscreen-body";
                    $(activeScreenID).fadeIn();
                } else if (data.instagram.state == "off") {
                    $(activeScreenID).fadeOut();
                }
            }
            activeScreenID = lastActiveScreenID;
        }

        // #### SOCIAL COOKING EVENTS #### //
        else if (data.hasOwnProperty("socialCooking")) {

            if (data.socialCooking.hasOwnProperty("state")) {
                console.log("Received command: " + data.socialCooking.state);
                if (data.socialCooking.state == "on") {

                    $(".socialCookingApp-container").fadeIn();
                } else if (data.socialCooking.state == "off") {
                    $(".socialCookingApp-container").fadeOut();
                }
            }

        }
        // #### NUTRITION PLANNER #### //
        else if (data.hasOwnProperty("nutritionPlanner")) {

            if (data.nutritionPlanner.hasOwnProperty("state")) {
                console.log("Received command: " + data.nutritionPlanner.state);
                if (data.nutritionPlanner.state == "on") {
                    // $("#nutritionPlanner-body").load("views/apps/nutritionplanner-app.html");
                    $("#nutritionPlanner-container").fadeIn();

                } else if (data.nutritionPlanner.state == "off") {
                    $("#nutritionPlanner-container").fadeOut(function () {
                        // $("#nutritionPlanner-body").empty();
                    });
                }
            }
        }
        // #### GROCERYLIST #### //
        else if (data.hasOwnProperty("groceryList")) {

            if (data.groceryList.hasOwnProperty("state")) {
                console.log("Received command: " + data.groceryList.state);
                if (data.groceryList.state == "on") {
                    // $("#groceryList-body").load("views/apps/grocerylist-app.html");
                    $("#groceryList-container").fadeIn();

                } else if (data.groceryList.state == "off") {
                    
                    $("#groceryList-container").fadeOut(function () {
                        // $("#groceryList-body").empty();
                    });
                }
            }

        } // #### STOVE EVENTS #### //
        else if (data.hasOwnProperty("stove")) {

            if (data.stove.hasOwnProperty("state")) {
                console.log("Received command: " + data.stove.state);
                if (data.stove.state == "on") {
                    
                    $("#stove-container").fadeIn();
                } else if (data.stove.state == "off") {
                    $("#stove-container").fadeOut();
                }
            }

        } // #### VIDEO EVENTS #### //
        else if (data.hasOwnProperty("video")) {

            if (data.video.hasOwnProperty("state")) {
                
                console.log("Received command: " + data.video.state);
                if (data.video.state == "on") {
                    $("#video-body").load("http://192.168.2.9:7070/webcontent/fair/views/apps/video-1.html");
                    $("#video-container").fadeIn();
                } else if (data.video.state == "off") {
                    $("#video-container").fadeOut(
                        function() {
                            $("#video-body").empty();
                        }
                    );
                }
            }

        } 

        // #### DIAL EVENTS #### //
        else if (data.hasOwnProperty("scrollUp")) {
            // scrollOffset = scrollOffset - 50; 
            console.log("Received command: scrollUp - " + data.scrollUp);
            $("#socialscreen").animate({
                scrollTop: "-=" + scrollOffset + "px"
            }, 100);

        } else if (data.hasOwnProperty("scrollDown")) {
            // scrollOffset = scrollOffset + 50; 
            console.log("Received command: scrollDown - " + data.scrollDown);
            console.log(activeScreenID);

            $("#socialscreen").animate({
                scrollTop: "+=" + scrollOffset + "px"

            }, 100);

        }

        /////////////////////////////
        // SUPRISE THEME FUNCTIONS //
        /////////////////////////////

        else if (data.hasOwnProperty("surprise")) {

            console.log("Received command: surprise - " + data.surprise);
            if (data.surprise == false) {
                vaaController.hideSurprise();
            } else {
                vaaController.showSurprise(data.surprise);
            }

        }
        /////////////////////////
        // VAA THEME FUNCTIONS //
        /////////////////////////

        else if (data.hasOwnProperty("setTheme")) {
            if (data.setTheme != "") {

                console.log("Received command: setTheme - " + data.setTheme);
                vaaController.setTheme(data.setTheme);
            }

        } else if (data.hasOwnProperty("sound")) {

            console.log("Received command: sound - " + data.sound);

            if (data.sound) {
                // Music ON
                soundController.unMuteAll();
            } else {
                // Music OFF
                soundController.muteAll();
            }

        } else if (data.hasOwnProperty("controller")) {
            if (data.controller.hasOwnProperty("state")) {
                console.log("Received command: " + data.controller.state);
                if (data.controller.state == "on") {
                    // Ask for update
                    if(useMeschupDevice) {
                        Android.sendData("{'controller': 'getMeschupState'}");  
                    }
                    $('#controller-container').fadeIn();
                    

                } else if (data.controller.state == "off") {

                   $('#controller-container').fadeOut();

                }
            }
        }
    }
}




