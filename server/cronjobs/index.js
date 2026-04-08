import express from "express";
import FetchLayoffData from "./fetchLayoffs.js";

const allCronjobs = () => {
    try {
        // You probably want to run it here
        FetchLayoffData();
    } catch (error) {
        console.log(error);
    }
};

export { allCronjobs };
