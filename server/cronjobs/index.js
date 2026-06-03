import FetchLayoffData from "./fetchLayoffs.js";

export const allCronjobs = () => {
    try {
        FetchLayoffData();
    } catch (error) {
        console.log(error);
    }
};


