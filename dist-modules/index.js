"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useGeolocated = useGeolocated;
const react_1 = require("react");
/**
 * Hook abstracting away the interaction with the Geolocation API.
 * @param config - the configuration to use
 */
function useGeolocated(config = {}) {
    const { positionOptions = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: Infinity,
    }, isOptimisticGeolocationEnabled = true, userDecisionTimeout = undefined, suppressLocationOnMount = false, watchPosition = false, geolocationProvider = typeof navigator !== "undefined"
        ? navigator.geolocation
        : undefined, watchLocationPermissionChange = false, onError, onSuccess, } = config;
    const userDecisionTimeoutId = (0, react_1.useRef)(0);
    const isCurrentlyMounted = (0, react_1.useRef)(true);
    const watchId = (0, react_1.useRef)(0);
    const [isGeolocationEnabled, setIsGeolocationEnabled] = (0, react_1.useState)(isOptimisticGeolocationEnabled);
    const [coords, setCoords] = (0, react_1.useState)();
    const [timestamp, setTimestamp] = (0, react_1.useState)();
    const [positionError, setPositionError] = (0, react_1.useState)();
    const [permissionState, setPermissionState] = (0, react_1.useState)();
    const shdowIsEqual = (0, react_1.useCallback)((a, b) => {
        if (a === b)
            return true;
        if (!a || !b)
            return false;
        return a.accuracy === b.accuracy &&
            a.altitude === b.altitude &&
            a.altitudeAccuracy === b.altitudeAccuracy &&
            a.heading === b.heading &&
            a.latitude === b.latitude &&
            a.longitude === b.longitude &&
            a.speed === b.speed;
    }, []);
    const updateCoords = (0, react_1.useCallback)((next) => {
        setCoords((prev) => {
            if (shdowIsEqual(prev, next)) {
                // avoiding unnecessary re-rendering
                return prev;
            }
            return next;
        });
    }, []);
    const cancelUserDecisionTimeout = (0, react_1.useCallback)(() => {
        if (userDecisionTimeoutId.current) {
            window.clearTimeout(userDecisionTimeoutId.current);
        }
    }, []);
    const handlePositionError = (0, react_1.useCallback)((error) => {
        cancelUserDecisionTimeout();
        if (isCurrentlyMounted.current) {
            setCoords(() => undefined);
            setIsGeolocationEnabled(false);
            setPositionError(error);
        }
        onError === null || onError === void 0 ? void 0 : onError(error);
    }, [onError, cancelUserDecisionTimeout]);
    const handlePositionSuccess = (0, react_1.useCallback)((position) => {
        cancelUserDecisionTimeout();
        if (isCurrentlyMounted.current) {
            updateCoords(position.coords);
            setTimestamp(position.timestamp);
            setIsGeolocationEnabled(true);
            setPositionError(() => undefined);
        }
        onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(position);
    }, [onSuccess, cancelUserDecisionTimeout]);
    const getPosition = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!(geolocationProvider === null || geolocationProvider === void 0 ? void 0 : geolocationProvider.getCurrentPosition) ||
            // we really want to check if the watchPosition is available
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            !geolocationProvider.watchPosition) {
            throw new Error("The provided geolocation provider is invalid");
        }
        const supportsPermissionsApi = typeof ((_a = navigator.permissions) === null || _a === void 0 ? void 0 : _a.query) === "function";
        let result = undefined;
        if (supportsPermissionsApi && !permissionState) {
            try {
                result = yield navigator.permissions.query({ name: "geolocation" });
                setPermissionState(result.state);
            }
            catch (e) {
                console.error("Error getting geolocation permission state", e);
            }
        }
        const state = permissionState || (result === null || result === void 0 ? void 0 : result.state);
        if (userDecisionTimeout && state !== "granted") {
            let userTimeout = userDecisionTimeout;
            if (!supportsPermissionsApi) {
                userTimeout = Math.max(userDecisionTimeout, (positionOptions === null || positionOptions === void 0 ? void 0 : positionOptions.timeout) || 0);
            }
            userDecisionTimeoutId.current = window.setTimeout(() => {
                handlePositionError();
            }, userTimeout);
        }
        if (watchPosition) {
            watchId.current = geolocationProvider.watchPosition(handlePositionSuccess, handlePositionError, positionOptions);
        }
        else {
            geolocationProvider.getCurrentPosition(handlePositionSuccess, handlePositionError, positionOptions);
        }
    }), [
        geolocationProvider,
        watchPosition,
        userDecisionTimeout,
        handlePositionError,
        handlePositionSuccess,
        positionOptions,
        permissionState,
    ]);
    const getPositionCached = (0, react_1.useCallback)((cacheTTL = 60 * 1000) => {
        const now = Date.now();
        // If we have cached coords and a valid timestamp and it's still fresh, return early.
        if (timestamp !== undefined && now - timestamp < cacheTTL) {
            return;
        }
        // Call the original getPosition function
        getPosition();
    }, [getPosition, handlePositionSuccess, coords, timestamp]);
    (0, react_1.useEffect)(() => {
        let permission = undefined;
        if (watchLocationPermissionChange &&
            geolocationProvider &&
            "permissions" in navigator) {
            navigator.permissions
                .query({ name: "geolocation" })
                .then((result) => {
                permission = result;
                permission.onchange = () => {
                    if (permission) {
                        setPermissionState(permission.state);
                    }
                };
            })
                .catch((e) => {
                console.error("Error updating the permissions", e);
            });
        }
        return () => {
            if (permission) {
                permission.onchange = null;
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    (0, react_1.useEffect)(() => {
        if (!suppressLocationOnMount) {
            getPosition();
        }
        return () => {
            cancelUserDecisionTimeout();
            if (watchPosition && watchId.current) {
                geolocationProvider === null || geolocationProvider === void 0 ? void 0 : geolocationProvider.clearWatch(watchId.current);
            }
        };
    }, [permissionState]); // eslint-disable-line react-hooks/exhaustive-deps
    return {
        getPosition,
        getPositionCached,
        coords,
        timestamp,
        isGeolocationEnabled,
        isGeolocationAvailable: Boolean(geolocationProvider),
        positionError,
    };
}
