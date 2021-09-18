const { expect } = require("chai")
const request = require("supertest")

const app = require("../../../index")
console.log(app)
// const { connect, close } = require("../../../db")

describe('POST /tournaments', () => {
  before((done) => {
    connect()
      .then(() => done())
      .catch((err) => done(err));
  })

  after((done) => {
    close()
      .then(() => done())
      .catch((err) => done(err));
  })


  describe('[POST] /tournaments __ ', () => {
    describe('when calling the api with an unique label arguments', () => {
      it('OK, creating a new note works', (done) => {
        request(app).post(`${API_VERSION}/tournaments`)
          .send({ name: 'NOTE', text: "AAA" })
          .then((res) => {
            const body = res.body;
            expect(body).to.contain.property('_id');
            expect(body).to.contain.property('name');
            expect(body).to.contain.property('text');
            done();
          })
          .catch((err) => done(err));
      });
    });
  });
})
