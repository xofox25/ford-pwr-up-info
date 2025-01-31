// Defines the main angular site instancelet authenticated = false;
let mainApp = angular.module("mainApp", ["ui.bootstrap", "ngSanitize"]);

$(window).on("load", () => {
    console.log("Document Ready...");
    const appleDevice = /iPad|iPhone|iPod|Mac OS/.test(navigator.userAgent) && !window.MSStream;
    const appleDevice2 = /iPad|iPhone|iPod|Mac OS/.test(navigator.userAgentData) && !window.MSStream;
    if (appleDevice || appleDevice2) {
        console.log("Apple Device Detected...");
        $("body").addClass("apple-device");
    }

    window.onerror = function (message, source, lineNumber, colno, error) {
        console.warn(`UNHANDLED ERROR: ${error.stack}`);
    };
});

mainApp.controller("PwrUpInfoController", [
    "$rootScope",
    "$scope",
    "$http",

    function ($rootScope, $scope, $http) {
        $scope.AllPowerUpData = null;
        $scope.FilteredPowerUpData = null;
        $scope.vehicleModelList = [];
        $scope.dataLoaded = false;

        $scope.formatDateToLocale = (dt) => {
            // console.log("formatDateToLocale: ", dt);
            return new Date(dt).toLocaleString();
        };

        $scope.fmtReleaseDate = (dt) => {
            //Formats date as March 2023
            let options = { month: "long", year: "numeric", timeZone: "UTC" };
            const date = new Date(dt);
            const day = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(date);
            // console.log(day);
            if (day && day > 1) {
                options.day = "numeric";
            }
            const resp = new Intl.DateTimeFormat("en-US", options).format(date);
            // console.log("fmtReleaseDate: ", resp);
            return resp;
        };

        $scope.getInhibitTagCls = (inhibit) => {
            return inhibit ? "badge-inhibit-enabled-tags" : "badge-inhibit-disabled-tags";
        };

        $scope.getWifiTagCls = (required) => {
            return required ? "badge-wift-required" : "badge-wifi-not-required";
        };

        $scope.getModelList = (items) => {
            let models = [];
            // collects all of the models from the submissions then creates a unique list
            items.map((item) => {
                if (item.models) {
                    item.models.map((model) => {
                        if (!models.includes(model)) {
                            models.push(model);
                        }
                    });
                }
            });

            console.log("models: ", models);
            return models.sort();
        };

        $scope.GetReleaseDateHtml = (sub) => {
            let divWrap = (span) => {
                return `<div class="d-flex align-items-center">${span}</div>`;
            };
            let html = "";
            if (sub.releaseDateUs && sub.releaseDateEu) {
                html += divWrap(`<span class="release-date-title">${$scope.fmtReleaseDate(sub.releaseDateUs)}<span class="badge badge-us-date my-auto ms-1 px-1 py-1">US</span></span>`);
                html += divWrap(`<span class="release-date-title">${$scope.fmtReleaseDate(sub.releaseDateEu)}<span class="badge badge-eu-date my-auto ms-1 px-1 py-1">EU</span></span>`);
            } else if (sub.releaseDateUs) {
                html += divWrap(`<span class="release-date-title">${$scope.fmtReleaseDate(sub.releaseDateUs)}</span>`);
            } else if (sub.releaseDateEu) {
                html += divWrap(`<span class="release-date-title">${$scope.fmtReleaseDate(sub.releaseDateEu)}<span class="badge badge-eu-date my-auto ms-1 px-1 py-1">EU</span></span>`);
            } else {
                html += divWrap(`<span class="release-date-title">No Release Date</span>`);
            }
            return html;
        };

        $scope.LoadPwrUpData = async () => {
            try {
                let data = (await $http.get("https://raw.githubusercontent.com/tonesto7/ford-pwr-up-info/main/powerup_data.json")).data;
                data.submissions = sortByMultipleKeys(data.submissions, ["releaseDateUs", "releaseDateEu", "powerupVersion"]);
                $scope.vehicleModelList = $scope.getModelList(data.submissions);
                $scope.AllPowerUpData = data;
                $scope.FilteredPowerUpData = data;
                $scope.dataLoaded = true;
            } catch (err) {
                console.log(`LoadPwrUpData Exception: `, err);
            }
            console.log("LoadPwrUpData: ", $scope.AllPowerUpData);
            $scope.$apply();
        };

        $scope.applyModelFilter = () => {
            let selectedModel = $("#vehicleModelFilter").val();
            console.log("selectedModel: ", selectedModel);
            if (!selectedModel) {
                $scope.FilteredPowerUpData = angular.copy($scope.AllPowerUpData);
            } else {
                $scope.FilteredPowerUpData = angular.copy($scope.AllPowerUpData);
                $scope.FilteredPowerUpData.submissions = $scope.FilteredPowerUpData.submissions.filter((item) => {
                    return item.models.includes(selectedModel) || item.changes.map((change) => change.model).includes(selectedModel);
                });
            }
        };

        $scope.LoadPwrUpData();
    },
]);

const capitalizeStr = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const decamelize = (str, capitalize = false, separator = " ") => {
    separator = typeof separator === "undefined" ? "_" : separator;
    let s = str.replace(/([a-z\d])([A-Z])/g, "$1" + separator + "$2").replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + separator + "$2");
    return capitalize ? capitalizeStr(s) : s;
};

const formatBytes = (bytes, noUnit = false) => {
    if (bytes < 1024) {
        return bytes + ` B`;
    } else if (bytes < 1048576) {
        return (bytes / 1024).toFixed(1) + (noUnit ? "" : " KB");
    } else if (bytes < 1073741824) {
        return (bytes / 1048576).toFixed(1) + (noUnit ? "" : " MB");
    } else {
        return (bytes / 1073741824).toFixed(1) + (noUnit ? "" : " GB");
    }
};

function sortByMultipleKeys(array, keys) {
    return array.sort((a, b) => {
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (a[key] < b[key]) {
                return 1;
            } else if (a[key] > b[key]) {
                return -1;
            }
        }
        return 0;
    });
}

const orderObjectBy = (input, attribute) => {
    if (!angular.isObject(input)) return input;

    var array = [];
    for (var objectKey in input) {
        array.push(input[objectKey]);
    }
    array.sort((a, b) => {
        var alc = a[attribute].toLowerCase(),
            blc = b[attribute].toLowerCase();
        return alc > blc ? 1 : alc < blc ? -1 : 0;
    });
    return array;
};

const orderObjectByTs = (input, attribute, dec = false) => {
    if (!angular.isObject(input)) return input;

    var array = [];
    for (var objectKey in input) {
        array.push(input[objectKey]);
    }
    array.sort((a, b) => {
        var alc = new Date(a[attribute]).getTime(),
            blc = new Date(b[attribute]).getTime();
        return dec ? (alc > blc ? -1 : alc < blc ? 1 : 0) : alc > blc ? 1 : alc < blc ? -1 : 0;
    });
    return array;
};
