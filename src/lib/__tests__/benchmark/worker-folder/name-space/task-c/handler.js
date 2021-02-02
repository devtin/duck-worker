export default async function (message) {
  await this.throw(`someError`, message)
}
