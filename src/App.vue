<template>
  <v-app>
    <v-main>
      <v-container fluid centered>
        <v-row>
          <v-col cols="6">
            <v-text-field label="TM Address" v-model="tm.address" type="url" />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="OBS Address"
              v-model="obs.address"
              type="url"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-text-field label="TM User" v-model="tm.user" />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="OBS Feildset"
              v-model="obs.feildset"
            ></v-text-field>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-text-field
              label="TM Password"
              v-model="tm.pass.value"
              class="input-group--focused"
              :type="tm.pass.show ? 'text' : 'password'"
              @click:append="tm.pass.show = !tm.pass.show"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="OBS Password"
              v-model="obs.pass.value"
              class="input-group--focused"
              :type="obs.pass.show ? 'text' : 'password'"
              @click:append="obs.pass.show = !obs.pass.show"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col>{{ fieldsets }}</v-col>
          <v-col>{{ scenses }}</v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-btn @click="connectTM()">Connect to TM</v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn @click="connectOBS()">Connect to OBS</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col> <v-btn @click="connectDB()">open TM</v-btn> </v-col>
          <v-col> {{ db }} </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              label="ShowMatchResultsStatus"
              v-model="ShowMatchResults"
            ></v-text-field
          ></v-col>
          <v-col>
            <v-btn @click="sendShowMatchResults()">
              send ShowMatchResults
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import type { TMWebUser } from "@/tmapi/wrappers/tmWeb";
import { MainResponseTypes } from "./ipcTypes";
//status vars
const db = ref("DB Not Open");
const fieldsets = ref([""]);
const scenses = ref([""]);
//TMWeb auth vars
const tm = reactive({
  address: "localhost",
  user: "admin",
  pass: {
    value: "t",
    show: false,
  },
});

//OBS WS auth vars
const obs = reactive({
  address: "localhost:4444",
  pass: {
    value: "2131FTW",
    show: false,
  },
  feildset: 1,
});
//api
function connectTM() {
  window.api
    .call("ConnectTMWeb", {
      url: tm.address,
      password: tm.pass.value,
      user: tm.user as unknown as TMWebUser,
    })
    .then((res) => {
      if (!(res instanceof Error))
        fieldsets.value = res.fieldsets.map((v) => v.name);
    })
    .catch((err) => console.error(err));
}
function connectOBS() {
  window.api
    .call("ConnectOBS", {
      host: obs.address,
      password: obs.pass.value,
    })
    .then((res) => {
      if (!(res instanceof Error)) scenses.value = res.scenes as string[];
    });
}
function connectDB() {
  window.api.call("ConnectTMDB").then((res) => {
    db.value = (res as MainResponseTypes["ConnectTMDB"]).msg;
  });
}
const ShowMatchResults = ref("");
const ShowMatchResultsStatus = ref("Send Match Results");
function sendShowMatchResults() {
  window.api.call("ShowMatchResults",ShowMatchResults.value).then((res) => {
    ShowMatchResultsStatus.value = "send: " + ShowMatchResults.value;
    ShowMatchResults.value = "";
  });
}
// onMounted(() => {});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
