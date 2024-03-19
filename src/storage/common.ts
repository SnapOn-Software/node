import { isNullOrEmptyString } from "@kwiz/common";
import axios from "axios";

export async function IsAzuriteRunning() {
    let responseServer = "";
    try {
        //make a request for http://127.0.0.1:10000/ expect response headers "Server" to contain "Azurite"
        const result = await axios.get("http://127.0.0.1:10000/");
        responseServer = result.headers.server;
    } catch (e) {
        responseServer = e.response && e.response.headers && e.response.headers.server;
    }

    return isNullOrEmptyString(responseServer) ? false : responseServer.toLowerCase().indexOf("azurite") >= 0;
}
