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
          <v-col cols="6">
            <v-btn @click="connectTM()">Connect to TM</v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn @click="connectOBS()">Connect to OBS</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import axios from 'axios';
import { reactive } from 'vue';
const tm = reactive({
  address: 'localhost',
  user: 'admin',
  pass: {
    value: null,
    show: false,
  },
});
const obs = reactive({
  address: 'localhost:4444',
  pass: {
    value: null,
    show: false,
  },
  feildset: 1,
});
function connectTM() {
  axios
    .post(
      'http://localhost:2131/connect',
      {
        host: tm.address,
        user: tm.user,
        password: tm.pass.value,
      },
      {}
    )
    .then((res) => {
      console.log(res);
    });
}
function connectOBS() {
  axios
    .post('http://localhost:2131/fieldsetOBS', {
      host: obs.address,
      password: obs.pass.value,
      id: obs.feildset,
    })
    .then((res) => {
      console.log(res);
    });
}
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
