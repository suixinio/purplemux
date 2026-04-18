if (!process.env.__PMUX_PRISTINE_ENV) {
  process.env.__PMUX_PRISTINE_ENV = JSON.stringify(process.env);
}
